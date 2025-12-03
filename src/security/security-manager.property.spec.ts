/**
 * Property-based tests for SecurityManager
 * Feature: mcp-screenshot, Property 16: Path validation rejects unauthorized paths
 * Feature: mcp-screenshot, Property 26: Rate limiting enforcement
 * Validates: Requirements 5.4, 10.4
 */

import * as fc from "fast-check";
import * as path from "path";
import * as os from "os";
import { SecurityManager } from "./security-manager";
import { PathValidationError, RateLimitError } from "../errors";

describe("SecurityManager Property-Based Tests", () => {
  /**
   * Feature: mcp-screenshot, Property 16: Path validation rejects unauthorized paths
   * For any file path outside allowed directories, the save operation should be
   * rejected with a path validation error.
   * Validates: Requirements 5.4
   */
  describe("Property 16: Path validation rejects unauthorized paths", () => {
    it("should reject paths outside allowed directories", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("/tmp", "/var", "/usr", "/home", "/opt"),
          fc.constantFrom("test", "data", "screenshots", "output"),
          fc.constantFrom("image.png", "screen.jpg", "capture.webp"),
          (baseDir, subDir, filename) => {
            // Create a security manager with a specific allowed directory
            const allowedDir = path.join(os.tmpdir(), "allowed-screenshots");
            const securityManager = new SecurityManager({
              allowedDirectories: [allowedDir],
            });

            // Create a path outside the allowed directory
            const unauthorizedPath = path.join(baseDir, subDir, filename);

            // Verify that the path is rejected
            expect(() => {
              securityManager.validatePath(unauthorizedPath);
            }).toThrow(PathValidationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept paths within allowed directories", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("screenshots", "images", "captures", "output"),
          fc.constantFrom("test", "data", "temp"),
          fc.constantFrom("image.png", "screen.jpg", "capture.webp"),
          (subDir1, subDir2, filename) => {
            // Create a security manager with a specific allowed directory
            const allowedDir = path.join(os.tmpdir(), "allowed-screenshots");
            const securityManager = new SecurityManager({
              allowedDirectories: [allowedDir],
            });

            // Create a path within the allowed directory
            const authorizedPath = path.join(
              allowedDir,
              subDir1,
              subDir2,
              filename
            );

            // Verify that the path is accepted (no exception thrown)
            expect(() => {
              securityManager.validatePath(authorizedPath);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject paths with path traversal attempts", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("screenshots", "images", "captures"),
          fc.constantFrom("etc", "var", "usr", "home"),
          fc.constantFrom("passwd", "shadow", "config.json"),
          (subDir, targetDir, filename) => {
            // Create a security manager with a specific allowed directory
            const allowedDir = path.join(os.tmpdir(), "allowed-screenshots");
            const securityManager = new SecurityManager({
              allowedDirectories: [allowedDir],
            });

            // Create a path with explicit .. that would escape the allowed directory
            // We construct the path as a string to avoid path.join normalization
            const traversalPath = `${allowedDir}/${subDir}/../../../${targetDir}/${filename}`;

            // Verify that the path is rejected
            expect(() => {
              securityManager.validatePath(traversalPath);
            }).toThrow(PathValidationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle multiple allowed directories correctly", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, 1, 2),
          fc.constantFrom("test", "data", "output"),
          fc.constantFrom("image.png", "screen.jpg"),
          (dirIndex, subDir, filename) => {
            // Create multiple allowed directories
            const allowedDirs = [
              path.join(os.tmpdir(), "allowed-dir-1"),
              path.join(os.tmpdir(), "allowed-dir-2"),
              path.join(os.tmpdir(), "allowed-dir-3"),
            ];

            const securityManager = new SecurityManager({
              allowedDirectories: allowedDirs,
            });

            // Create a path in one of the allowed directories
            const authorizedPath = path.join(
              allowedDirs[dirIndex],
              subDir,
              filename
            );

            // Verify that the path is accepted
            expect(() => {
              securityManager.validatePath(authorizedPath);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject absolute paths outside allowed directories", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("/tmp/evil", "/var/evil", "/usr/evil", "/home/evil"),
          fc.constantFrom("malicious.png", "bad.jpg"),
          (evilDir, filename) => {
            // Create a security manager with a specific allowed directory
            const allowedDir = path.join(os.tmpdir(), "allowed-screenshots");
            const securityManager = new SecurityManager({
              allowedDirectories: [allowedDir],
            });

            // Create an absolute path outside allowed directories
            const unauthorizedPath = path.join(evilDir, filename);

            // Verify that the path is rejected
            expect(() => {
              securityManager.validatePath(unauthorizedPath);
            }).toThrow(PathValidationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle relative paths correctly", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("subdir", "nested/dir", "deep/nested/dir"),
          fc.constantFrom("image.png", "screen.jpg"),
          (relativeDir, filename) => {
            // Create a security manager with current working directory as allowed
            const allowedDir = process.cwd();
            const securityManager = new SecurityManager({
              allowedDirectories: [allowedDir],
            });

            // Create a relative path
            const relativePath = path.join(relativeDir, filename);

            // Verify that the path is accepted (relative paths resolve to cwd)
            expect(() => {
              securityManager.validatePath(relativePath);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: mcp-screenshot, Property 26: Rate limiting enforcement
   * For any configured rate limit, when the limit is exceeded within the time window,
   * subsequent capture requests should be rejected with a rate limit error.
   * Validates: Requirements 10.4
   */
  describe("Property 26: Rate limiting enforcement", () => {
    it("should enforce rate limit when exceeded", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.constantFrom("agent-1", "agent-2", "agent-3"),
          (maxCaptures, agentId) => {
            // Create a security manager with a specific rate limit
            const securityManager = new SecurityManager({
              maxCapturesPerMinute: maxCaptures,
            });

            // Perform captures up to the limit
            for (let i = 0; i < maxCaptures; i++) {
              expect(() => {
                securityManager.checkRateLimit(agentId);
              }).not.toThrow();
            }

            // The next capture should exceed the limit
            expect(() => {
              securityManager.checkRateLimit(agentId);
            }).toThrow(RateLimitError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should allow captures within rate limit", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 1, max: 4 }),
          fc.constantFrom("agent-1", "agent-2", "agent-3"),
          (maxCaptures, numCaptures, agentId) => {
            // Ensure numCaptures is less than maxCaptures
            const actualNumCaptures = Math.min(numCaptures, maxCaptures - 1);

            // Create a security manager with a specific rate limit
            const securityManager = new SecurityManager({
              maxCapturesPerMinute: maxCaptures,
            });

            // Perform captures within the limit
            for (let i = 0; i < actualNumCaptures; i++) {
              expect(() => {
                securityManager.checkRateLimit(agentId);
              }).not.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should track rate limits per agent independently", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          fc.constantFrom("agent-1", "agent-2"),
          fc.constantFrom("agent-3", "agent-4"),
          (maxCaptures, agentId1, agentId2) => {
            // Create a security manager with a specific rate limit
            const securityManager = new SecurityManager({
              maxCapturesPerMinute: maxCaptures,
            });

            // Agent 1 uses up their limit
            for (let i = 0; i < maxCaptures; i++) {
              expect(() => {
                securityManager.checkRateLimit(agentId1);
              }).not.toThrow();
            }

            // Agent 1 should be rate limited
            expect(() => {
              securityManager.checkRateLimit(agentId1);
            }).toThrow(RateLimitError);

            // Agent 2 should still be able to make captures
            expect(() => {
              securityManager.checkRateLimit(agentId2);
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reset rate limit after time window expires", async () => {
      // This test uses a shorter time window for testing purposes
      const maxCaptures = 2;
      const agentId = "test-agent";

      // Create a security manager with a specific rate limit
      const securityManager = new SecurityManager({
        maxCapturesPerMinute: maxCaptures,
      });

      // Use up the rate limit
      for (let i = 0; i < maxCaptures; i++) {
        expect(() => {
          securityManager.checkRateLimit(agentId);
        }).not.toThrow();
      }

      // Should be rate limited now
      expect(() => {
        securityManager.checkRateLimit(agentId);
      }).toThrow(RateLimitError);

      // Wait for the time window to expire (61 seconds)
      // Note: This is a long test, but necessary to verify time-based behavior
      await new Promise((resolve) => setTimeout(resolve, 61000));

      // Should be able to make captures again
      expect(() => {
        securityManager.checkRateLimit(agentId);
      }).not.toThrow();
    }, 70000); // 70 second timeout

    it("should handle concurrent rate limit checks correctly", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }),
          fc.constantFrom("agent-1", "agent-2"),
          (maxCaptures, agentId) => {
            // Create a security manager with a specific rate limit
            const securityManager = new SecurityManager({
              maxCapturesPerMinute: maxCaptures,
            });

            // Track successful captures
            let successfulCaptures = 0;
            let rateLimitErrors = 0;

            // Attempt more captures than the limit
            for (let i = 0; i < maxCaptures + 5; i++) {
              try {
                securityManager.checkRateLimit(agentId);
                successfulCaptures++;
              } catch (error) {
                if (error instanceof RateLimitError) {
                  rateLimitErrors++;
                } else {
                  throw error;
                }
              }
            }

            // Verify that exactly maxCaptures succeeded
            expect(successfulCaptures).toBe(maxCaptures);

            // Verify that the remaining attempts were rate limited
            expect(rateLimitErrors).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include rate limit details in error", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.constantFrom("agent-1", "agent-2"),
          (maxCaptures, agentId) => {
            // Create a security manager with a specific rate limit
            const securityManager = new SecurityManager({
              maxCapturesPerMinute: maxCaptures,
            });

            // Use up the rate limit
            for (let i = 0; i < maxCaptures; i++) {
              securityManager.checkRateLimit(agentId);
            }

            // Try to exceed the limit and capture the error
            try {
              securityManager.checkRateLimit(agentId);
              fail("Expected RateLimitError to be thrown");
            } catch (error) {
              expect(error).toBeInstanceOf(RateLimitError);
              const rateLimitError = error as RateLimitError;

              // Verify error details
              expect(rateLimitError.details).toBeDefined();
              expect(rateLimitError.details.agentId).toBe(agentId);
              expect(rateLimitError.details.limit).toBe(maxCaptures);
              expect(rateLimitError.details.current).toBeGreaterThanOrEqual(
                maxCaptures
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for audit logging
   */
  describe("Audit Logging Properties", () => {
    it("should log audit entries when enabled", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("capture_screen", "capture_window", "capture_region"),
          fc.record({
            format: fc.constantFrom("png", "jpeg", "webp"),
            quality: fc.integer({ min: 1, max: 100 }),
          }),
          fc.record({
            status: fc.constantFrom("success", "error"),
          }),
          (operation, params, result) => {
            // Spy on console.log
            const originalLog = console.log;
            const logCalls: any[] = [];
            console.log = jest.fn((...args) => {
              logCalls.push(args);
            });

            try {
              // Create a security manager with audit logging enabled
              const securityManager = new SecurityManager({
                enableAuditLog: true,
              });

              // Log an audit entry
              securityManager.auditLog(operation, params, result);

              // Verify that console.log was called
              expect(logCalls.length).toBe(1);

              // Parse the logged JSON
              const loggedData = JSON.parse(logCalls[0][0]);

              // Verify the logged data
              expect(loggedData.operation).toBe(operation);
              expect(loggedData.params).toEqual(params);
              expect(loggedData.result).toBe(result.status);
              expect(loggedData.timestamp).toBeDefined();
            } finally {
              // Restore console.log
              console.log = originalLog;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not log audit entries when disabled", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("capture_screen", "capture_window"),
          fc.record({ format: fc.constantFrom("png", "jpeg") }),
          fc.record({ status: fc.constantFrom("success", "error") }),
          (operation, params, result) => {
            // Spy on console.log
            const originalLog = console.log;
            const logCalls: any[] = [];
            console.log = jest.fn((...args) => {
              logCalls.push(args);
            });

            try {
              // Create a security manager with audit logging disabled
              const securityManager = new SecurityManager({
                enableAuditLog: false,
              });

              // Log an audit entry
              securityManager.auditLog(operation, params, result);

              // Verify that console.log was not called
              expect(logCalls.length).toBe(0);
            } finally {
              // Restore console.log
              console.log = originalLog;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for policy management
   */
  describe("Policy Management Properties", () => {
    it("should load and apply new security policies", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom("/tmp/dir1", "/tmp/dir2", "/tmp/dir3"), {
            minLength: 1,
            maxLength: 5,
          }),
          fc.integer({ min: 1, max: 100 }),
          (allowedDirs, maxCaptures) => {
            // Create a security manager with initial policy
            const securityManager = new SecurityManager({
              allowedDirectories: ["/tmp/initial"],
              maxCapturesPerMinute: 10,
            });

            // Load a new policy
            securityManager.loadPolicy({
              allowedDirectories: allowedDirs,
              blockedWindowPatterns: [],
              maxCapturesPerMinute: maxCaptures,
              enableAuditLog: true,
            });

            // Verify the new policy is applied
            const policy = securityManager.getPolicy();
            expect(policy.allowedDirectories).toEqual(allowedDirs);
            expect(policy.maxCapturesPerMinute).toBe(maxCaptures);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return a copy of the policy to prevent external modification", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom("/tmp/dir1", "/tmp/dir2"), {
            minLength: 1,
            maxLength: 3,
          }),
          (allowedDirs) => {
            // Create a security manager
            const securityManager = new SecurityManager({
              allowedDirectories: [...allowedDirs],
            });

            // Get the policy
            const policy1 = securityManager.getPolicy();

            // Modify the returned policy
            policy1.allowedDirectories.push("/tmp/evil");

            // Get the policy again
            const policy2 = securityManager.getPolicy();

            // Verify the original policy was not modified
            expect(policy2.allowedDirectories).toEqual(allowedDirs);
            expect(policy2.allowedDirectories).not.toContain("/tmp/evil");
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
