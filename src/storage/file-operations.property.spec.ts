/**
 * Property-based tests for FileOperations
 * Feature: mcp-screenshot, Property 13: File save creates file at path
 * Feature: mcp-screenshot, Property 14: Base64 encoding when no path provided
 * Validates: Requirements 5.1, 5.2
 */

import * as fc from "fast-check";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import sharp from "sharp";
import { FileOperations } from "./file-operations";
import { ImageFormat } from "../types";

describe("FileOperations Property-Based Tests", () => {
  let fileOps: FileOperations;
  let tempDir: string;

  beforeAll(async () => {
    fileOps = new FileOperations();
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-screenshot-test-"));
  });

  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Feature: mcp-screenshot, Property 13: File save creates file at path
   * For any valid file path within allowed directories, when a screenshot is saved,
   * a file should exist at that path with non-zero size.
   * Validates: Requirements 5.1
   */
  describe("Property 13: File save creates file at path", () => {
    it("should create a file at the specified path with non-zero size", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 200 }),
          fc.integer({ min: 10, max: 200 }),
          // Generate arbitrary RGB color
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          // Generate arbitrary filename (alphanumeric with extension)
          fc
            .array(
              fc.constantFrom(
                ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
              ),
              { minLength: 1, maxLength: 20 }
            )
            .map((chars) => `${chars.join('')}.png`),
          async (width, height, r, g, b, filename: string) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r, g, b },
              },
            })
              .png()
              .toBuffer();

            // Generate file path in temp directory
            const filePath = path.join(tempDir, filename);

            // Save the file
            const result = await fileOps.saveToFile(testImageBuffer, filePath);

            // Property: File should exist at the path
            const fileExists = await fs
              .access(result.absolutePath)
              .then(() => true)
              .catch(() => false);
            expect(fileExists).toBe(true);

            // Property: File should have non-zero size
            const stats = await fs.stat(result.absolutePath);
            expect(stats.size).toBeGreaterThan(0);

            // Property: Returned file size should match actual file size
            expect(result.fileSize).toBe(stats.size);

            // Property: Returned path should be absolute
            expect(path.isAbsolute(result.absolutePath)).toBe(true);

            // Property: File content should match the buffer
            const savedContent = await fs.readFile(result.absolutePath);
            expect(savedContent.equals(testImageBuffer)).toBe(true);

            // Clean up
            await fs.unlink(result.absolutePath).catch(() => {});
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should create parent directories if they don't exist", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          // Generate arbitrary nested directory structure (1-3 levels)
          fc.integer({ min: 1, max: 3 }),
          fc
            .array(
              fc.constantFrom(
                ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
              ),
              { minLength: 1, maxLength: 10 }
            )
            .map((chars) => `${chars.join('')}.png`),
          async (width, height, depth, filename: string) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .png()
              .toBuffer();

            // Generate nested directory path
            const nestedDirs = Array.from(
              { length: depth },
              (_, i) => `dir${i}`
            );
            const filePath = path.join(tempDir, ...nestedDirs, filename);

            // Verify parent directory doesn't exist yet
            const parentDir = path.dirname(filePath);
            const parentExists = await fs
              .access(parentDir)
              .then(() => true)
              .catch(() => false);

            // Save the file
            const result = await fileOps.saveToFile(testImageBuffer, filePath);

            // Property: Parent directories should be created
            const parentExistsAfter = await fs
              .access(parentDir)
              .then(() => true)
              .catch(() => false);
            expect(parentExistsAfter).toBe(true);

            // Property: File should exist
            const fileExists = await fs
              .access(result.absolutePath)
              .then(() => true)
              .catch(() => false);
            expect(fileExists).toBe(true);

            // Property: File should have correct content
            const savedContent = await fs.readFile(result.absolutePath);
            expect(savedContent.equals(testImageBuffer)).toBe(true);

            // Clean up
            await fs.rm(path.join(tempDir, nestedDirs[0]), {
              recursive: true,
              force: true,
            });
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should create directories with secure permissions (700)", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          // Generate arbitrary directory name
          fc
            .array(
              fc.constantFrom(
                ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
              ),
              { minLength: 1, maxLength: 10 }
            )
            .map((chars) => `secure-${chars.join('')}`),
          async (width, height, dirName: string) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .png()
              .toBuffer();

            // Generate file path with new directory
            const filePath = path.join(tempDir, dirName, "test.png");

            // Save the file
            const result = await fileOps.saveToFile(testImageBuffer, filePath);

            // Property: Directory should have secure permissions (700)
            // Note: On Windows, permissions work differently, so we skip this check
            if (process.platform !== "win32") {
              const dirStats = await fs.stat(path.dirname(result.absolutePath));
              const mode = dirStats.mode & 0o777; // Extract permission bits
              expect(mode).toBe(0o700); // rwx------
            }

            // Property: File should exist
            const fileExists = await fs
              .access(result.absolutePath)
              .then(() => true)
              .catch(() => false);
            expect(fileExists).toBe(true);

            // Clean up
            await fs.rm(path.join(tempDir, dirName), {
              recursive: true,
              force: true,
            });
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should return absolute path regardless of input path format", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          // Generate arbitrary filename
          fc
            .array(
              fc.constantFrom(
                ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
              ),
              { minLength: 1, maxLength: 10 }
            )
            .map((chars) => `${chars.join('')}.png`),
          // Generate path type (relative or absolute)
          fc.boolean(),
          async (width, height, filename: string, useRelative) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .png()
              .toBuffer();

            // Generate file path (relative or absolute)
            const filePath = useRelative
              ? path.relative(process.cwd(), path.join(tempDir, filename))
              : path.join(tempDir, filename);

            // Save the file
            const result = await fileOps.saveToFile(testImageBuffer, filePath);

            // Property: Returned path should always be absolute
            expect(path.isAbsolute(result.absolutePath)).toBe(true);

            // Property: File should exist at the absolute path
            const fileExists = await fs
              .access(result.absolutePath)
              .then(() => true)
              .catch(() => false);
            expect(fileExists).toBe(true);

            // Clean up
            await fs.unlink(result.absolutePath).catch(() => {});
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Feature: mcp-screenshot, Property 14: Base64 encoding when no path provided
   * For any screenshot capture without a file path, the response should contain
   * base64-encoded image data.
   * Validates: Requirements 5.2
   */
  describe("Property 14: Base64 encoding when no path provided", () => {
    it("should encode image buffer as valid base64 string", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 200 }),
          fc.integer({ min: 10, max: 200 }),
          // Generate arbitrary RGB color
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          // Generate arbitrary format
          fc.constantFrom<ImageFormat>("png", "jpeg", "webp", "bmp"),
          async (width, height, r, g, b, format) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r, g, b },
              },
            })
              .png()
              .toBuffer();

            // Encode as base64
            const result = fileOps.encodeBase64(testImageBuffer, format);

            // Property: Result should contain data and mimeType
            expect(result).toHaveProperty("data");
            expect(result).toHaveProperty("mimeType");

            // Property: Data should be a non-empty string
            expect(typeof result.data).toBe("string");
            expect(result.data.length).toBeGreaterThan(0);

            // Property: Data should be valid base64
            // Base64 only contains A-Z, a-z, 0-9, +, /, and = for padding
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            expect(base64Regex.test(result.data)).toBe(true);

            // Property: MIME type should match the format
            const expectedMimeTypes: Record<ImageFormat, string> = {
              png: "image/png",
              jpeg: "image/jpeg",
              webp: "image/webp",
              bmp: "image/bmp",
            };
            expect(result.mimeType).toBe(expectedMimeTypes[format]);

            // Property: Base64 string should decode back to original buffer
            const decodedBuffer = Buffer.from(result.data, "base64");
            expect(decodedBuffer.equals(testImageBuffer)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should handle large images efficiently", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate larger image dimensions
          fc.integer({ min: 500, max: 1000 }),
          fc.integer({ min: 500, max: 1000 }),
          // Generate arbitrary format
          fc.constantFrom<ImageFormat>("png", "jpeg", "webp", "bmp"),
          async (width, height, format) => {
            // Create a large test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .png()
              .toBuffer();

            // Measure encoding time
            const startTime = Date.now();
            const result = fileOps.encodeBase64(testImageBuffer, format);
            const encodingTime = Date.now() - startTime;

            // Property: Encoding should complete in reasonable time (< 1 second)
            expect(encodingTime).toBeLessThan(1000);

            // Property: Result should be valid
            expect(result.data.length).toBeGreaterThan(0);
            expect(result.mimeType).toBeTruthy();

            // Property: Base64 string should decode back to original buffer
            const decodedBuffer = Buffer.from(result.data, "base64");
            expect(decodedBuffer.equals(testImageBuffer)).toBe(true);
          }
        ),
        { numRuns: 50 } // Fewer runs for large images
      );
    }, 120000); // 2 minute timeout for large images

    it("should produce base64 strings with correct length", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 200 }),
          fc.integer({ min: 10, max: 200 }),
          // Generate arbitrary format
          fc.constantFrom<ImageFormat>("png", "jpeg", "webp", "bmp"),
          async (width, height, format) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .png()
              .toBuffer();

            // Encode as base64
            const result = fileOps.encodeBase64(testImageBuffer, format);

            // Property: Base64 length should be approximately 4/3 of buffer length
            // Base64 encoding increases size by ~33%
            const expectedMinLength = Math.floor(
              (testImageBuffer.length * 4) / 3
            );
            const expectedMaxLength = Math.ceil(
              (testImageBuffer.length * 4) / 3 + 4
            ); // +4 for padding
            expect(result.data.length).toBeGreaterThanOrEqual(
              expectedMinLength
            );
            expect(result.data.length).toBeLessThanOrEqual(expectedMaxLength);

            // Property: Decoded buffer should have original length
            const decodedBuffer = Buffer.from(result.data, "base64");
            expect(decodedBuffer.length).toBe(testImageBuffer.length);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should include correct MIME type for all formats", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          async (width, height) => {
            // Create a test image buffer
            const testImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .png()
              .toBuffer();

            // Test all formats
            const formats: ImageFormat[] = ["png", "jpeg", "webp", "bmp"];
            const expectedMimeTypes: Record<ImageFormat, string> = {
              png: "image/png",
              jpeg: "image/jpeg",
              webp: "image/webp",
              bmp: "image/bmp",
            };

            for (const format of formats) {
              const result = fileOps.encodeBase64(testImageBuffer, format);

              // Property: MIME type should match format
              expect(result.mimeType).toBe(expectedMimeTypes[format]);

              // Property: MIME type should start with "image/"
              expect(result.mimeType).toMatch(/^image\//);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
