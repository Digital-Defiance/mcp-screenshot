/**
 * Security manager for policy enforcement
 */

import * as path from "path";
import { ISecurityManager } from "../interfaces";
import { SecurityPolicy } from "../types";
import { PathValidationError, RateLimitError } from "../errors";

/**
 * Security manager implementation
 */
export class SecurityManager implements ISecurityManager {
  private policy: SecurityPolicy;
  private captureCount: Map<string, number[]> = new Map();

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      allowedDirectories: policy?.allowedDirectories || [process.cwd()],
      blockedWindowPatterns: policy?.blockedWindowPatterns || [],
      maxCapturesPerMinute: policy?.maxCapturesPerMinute || 60,
      enableAuditLog:
        policy?.enableAuditLog !== undefined ? policy.enableAuditLog : true,
    };
  }

  /**
   * Validate a file path against security policies
   */
  validatePath(filePath: string): void {
    const resolved = path.resolve(filePath);

    // Check for path traversal
    if (resolved.includes("..")) {
      throw new PathValidationError("Path traversal detected", {
        path: filePath,
      });
    }

    // Check allowed directories
    const allowed = this.policy.allowedDirectories.some((dir) => {
      const resolvedDir = path.resolve(dir);
      return resolved.startsWith(resolvedDir);
    });

    if (!allowed) {
      throw new PathValidationError("Path outside allowed directories", {
        path: filePath,
        allowedDirectories: this.policy.allowedDirectories,
      });
    }
  }

  /**
   * Check rate limit for an agent
   */
  checkRateLimit(agentId: string): void {
    const now = Date.now();
    const captures = this.captureCount.get(agentId) || [];

    // Remove captures older than 1 minute
    const recent = captures.filter((t) => now - t < 60000);

    if (recent.length >= this.policy.maxCapturesPerMinute) {
      throw new RateLimitError("Rate limit exceeded", {
        agentId,
        limit: this.policy.maxCapturesPerMinute,
        current: recent.length,
      });
    }

    recent.push(now);
    this.captureCount.set(agentId, recent);
  }

  /**
   * Log an audit entry
   */
  auditLog(operation: string, params: any, result: any): void {
    if (this.policy.enableAuditLog) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          operation,
          params,
          result: result.status || "unknown",
        })
      );
    }
  }

  /**
   * Load security policy from configuration
   */
  loadPolicy(config: SecurityPolicy): void {
    this.policy = config;
  }

  /**
   * Get current security policy
   */
  getPolicy(): SecurityPolicy {
    return {
      ...this.policy,
      allowedDirectories: [...this.policy.allowedDirectories],
      blockedWindowPatterns: [...this.policy.blockedWindowPatterns],
    };
  }
}
