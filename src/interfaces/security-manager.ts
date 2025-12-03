/**
 * Interface for security policy enforcement
 */

import { SecurityPolicy } from "../types";

/**
 * Security manager interface
 */
export interface ISecurityManager {
  /**
   * Validate a file path against security policies
   * @param filePath Path to validate
   * @throws SecurityError if path is invalid
   */
  validatePath(filePath: string): void;

  /**
   * Check rate limit for an agent
   * @param agentId Agent identifier
   * @throws SecurityError if rate limit exceeded
   */
  checkRateLimit(agentId: string): void;

  /**
   * Log an audit entry
   * @param operation Operation name
   * @param params Operation parameters
   * @param result Operation result
   */
  auditLog(operation: string, params: any, result: any): void;

  /**
   * Load security policy from configuration
   * @param config Security policy configuration
   */
  loadPolicy(config: SecurityPolicy): void;

  /**
   * Get current security policy
   * @returns Current security policy
   */
  getPolicy(): SecurityPolicy;
}
