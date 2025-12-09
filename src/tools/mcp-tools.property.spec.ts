/**
 * Property-based tests for MCP tools
 * Feature: mcp-screenshot
 */

import * as fc from "fast-check";
import { MCPTools } from "./mcp-tools";
import { ImageFormat } from "../types";

describe("MCP Tools Property Tests", () => {
  let mcpTools: MCPTools;

  beforeEach(() => {
    // Create MCPTools instance with test security policy
    mcpTools = new MCPTools(
      {
        allowedDirectories: [process.cwd()],
        maxCapturesPerMinute: 1000, // High limit for tests
        enableAuditLog: false, // Disable audit logging in tests
      },
      []
    );
  });

  afterEach(async () => {
    await mcpTools.cleanup();
  });

  /**
   * Feature: mcp-screenshot, Property 23: Response structure consistency
   * Validates: Requirements 9.1
   *
   * For any screenshot operation (success or failure), the response should be
   * a structured JSON object with a status field.
   */
  describe("Property 23: Response structure consistency", () => {
    it("should return structured response with status field for all operations", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operation: fc.constantFrom(
              "captureFullScreen",
              "captureWindow",
              "captureRegion",
              "listDisplays",
              "listWindows"
            ),
            format: fc.constantFrom<ImageFormat>("png", "jpeg", "webp", "bmp"),
            quality: fc.option(fc.integer({ min: 1, max: 100 })),
          }),
          async ({ operation, format, quality }) => {
            let response: any;

            try {
              switch (operation) {
                case "captureFullScreen":
                  response = await mcpTools.captureFullScreen({
                    format,
                    quality: quality ?? undefined,
                  });
                  break;

                case "captureWindow":
                  // This will fail (no window specified), but should still return structured response
                  response = await mcpTools.captureWindow({
                    format,
                    quality: quality ?? undefined,
                  });
                  break;

                case "captureRegion":
                  response = await mcpTools.captureRegion({
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 100,
                    format,
                    quality: quality ?? undefined,
                  });
                  break;

                case "listDisplays":
                  response = await mcpTools.listDisplays();
                  break;

                case "listWindows":
                  response = await mcpTools.listWindows();
                  break;
              }

              // All responses must have a status field
              expect(response).toHaveProperty("status");
              expect(["success", "error"]).toContain(response.status);

              // If error, must have error object with code and message
              if (response.status === "error") {
                expect(response).toHaveProperty("error");
                expect(response.error).toHaveProperty("code");
                expect(response.error).toHaveProperty("message");
                expect(typeof response.error.code).toBe("string");
                expect(typeof response.error.message).toBe("string");
              }

              // If success for capture operations, must have either data or filePath
              if (
                response.status === "success" &&
                [
                  "captureFullScreen",
                  "captureWindow",
                  "captureRegion",
                ].includes(operation)
              ) {
                const hasData = response.hasOwnProperty("data");
                const hasFilePath = response.hasOwnProperty("filePath");
                expect(hasData || hasFilePath).toBe(true);
              }

              // If success for list operations, must have appropriate list
              if (
                response.status === "success" &&
                operation === "listDisplays"
              ) {
                expect(response).toHaveProperty("displays");
                expect(Array.isArray(response.displays)).toBe(true);
              }

              if (
                response.status === "success" &&
                operation === "listWindows"
              ) {
                expect(response).toHaveProperty("windows");
                expect(Array.isArray(response.windows)).toBe(true);
              }
            } catch (error) {
              // Even if an exception is thrown, we should have caught it and returned structured response
              // This test should not throw
              throw new Error(
                `Operation ${operation} threw exception instead of returning structured error response`
              );
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 180000); // 180 second timeout for property test
  });

  /**
   * Feature: mcp-screenshot, Property 24: Metadata completeness
   * Validates: Requirements 9.3
   *
   * For any successful screenshot capture, the metadata should include
   * dimensions, format, file size, timestamp, and display/window/region
   * information as applicable.
   */
  describe("Property 24: Metadata completeness", () => {
    it("should include complete metadata for all successful capture operations", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            operation: fc.constantFrom("captureFullScreen", "captureRegion"),
            format: fc.constantFrom<ImageFormat>("png", "jpeg", "webp", "bmp"),
            quality: fc.option(fc.integer({ min: 1, max: 100 })),
            x: fc.integer({ min: 0, max: 100 }),
            y: fc.integer({ min: 0, max: 100 }),
            width: fc.integer({ min: 10, max: 200 }),
            height: fc.integer({ min: 10, max: 200 }),
          }),
          async ({ operation, format, quality, x, y, width, height }) => {
            let response: any;

            switch (operation) {
              case "captureFullScreen":
                response = await mcpTools.captureFullScreen({
                  format,
                  quality: quality ?? undefined,
                });
                break;

              case "captureRegion":
                response = await mcpTools.captureRegion({
                  x,
                  y,
                  width,
                  height,
                  format,
                  quality: quality ?? undefined,
                });
                break;
            }

            // Only check metadata for successful operations
            if (response.status === "success") {
              // All successful captures must have metadata
              expect(response).toHaveProperty("metadata");
              const metadata = response.metadata;

              // Check required fields
              expect(metadata).toHaveProperty("width");
              expect(metadata).toHaveProperty("height");
              expect(metadata).toHaveProperty("format");
              expect(metadata).toHaveProperty("fileSize");
              expect(metadata).toHaveProperty("timestamp");

              // Validate types
              expect(typeof metadata.width).toBe("number");
              expect(typeof metadata.height).toBe("number");
              expect(typeof metadata.format).toBe("string");
              expect(typeof metadata.fileSize).toBe("number");
              expect(typeof metadata.timestamp).toBe("string");

              // Validate values
              expect(metadata.width).toBeGreaterThan(0);
              expect(metadata.height).toBeGreaterThan(0);
              expect(metadata.fileSize).toBeGreaterThan(0);
              expect(metadata.format).toBe(format);

              // Timestamp should be valid ISO string
              expect(() => new Date(metadata.timestamp)).not.toThrow();
              expect(new Date(metadata.timestamp).toISOString()).toBe(
                metadata.timestamp
              );

              // Check operation-specific metadata
              if (operation === "captureFullScreen") {
                // Full screen captures should have display info
                expect(metadata).toHaveProperty("display");
                if (metadata.display) {
                  expect(metadata.display).toHaveProperty("id");
                  expect(metadata.display).toHaveProperty("name");
                  expect(metadata.display).toHaveProperty("resolution");
                  expect(metadata.display).toHaveProperty("position");
                  expect(metadata.display).toHaveProperty("isPrimary");
                }
              }

              if (operation === "captureRegion") {
                // Region captures should have region info
                expect(metadata).toHaveProperty("region");
                expect(metadata.region).toHaveProperty("x");
                expect(metadata.region).toHaveProperty("y");
                expect(metadata.region).toHaveProperty("width");
                expect(metadata.region).toHaveProperty("height");

                // Region coordinates should match request (or be clipped)
                expect(metadata.region.x).toBe(x);
                expect(metadata.region.y).toBe(y);
                expect(metadata.region.width).toBeGreaterThan(0);
                expect(metadata.region.height).toBeGreaterThan(0);
                expect(metadata.region.width).toBeLessThanOrEqual(width);
                expect(metadata.region.height).toBeLessThanOrEqual(height);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    }, 180000); // 180 second timeout for property test
  });
});
