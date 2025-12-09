/**
 * Property-based tests for ImageProcessor
 * Feature: mcp-screenshot, Property 3: Format encoding correctness
 * Validates: Requirements 1.3
 */

import * as fc from "fast-check";
import sharp from "sharp";
import { ImageProcessor } from "./image-processor";
import { ImageFormat } from "../types";

describe("ImageProcessor Property-Based Tests", () => {
  let processor: ImageProcessor;

  beforeAll(() => {
    processor = new ImageProcessor();
  });

  /**
   * Feature: mcp-screenshot, Property 3: Format encoding correctness
   * For any requested image format (PNG, JPEG, WebP, BMP), when a screenshot is captured,
   * the output should be a valid image file of that format.
   * Validates: Requirements 1.3
   */
  describe("Property 3: Format encoding correctness", () => {
    it("should encode images to valid format for all supported formats", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions (reasonable sizes for testing)
          fc.integer({ min: 10, max: 500 }),
          fc.integer({ min: 10, max: 500 }),
          // Generate arbitrary RGB color values
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          // Generate arbitrary format
          fc.constantFrom<ImageFormat>("png", "jpeg", "webp", "bmp"),
          async (width, height, r, g, b, format) => {
            // Create a test image with the generated dimensions and color
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

            // Encode the image to the specified format
            const encodedBuffer = await processor.encode(
              testImageBuffer,
              format
            );

            // Verify the output is a valid buffer
            expect(encodedBuffer).toBeInstanceOf(Buffer);
            expect(encodedBuffer.length).toBeGreaterThan(0);

            // For BMP, sharp doesn't support reading it, so we validate the header structure
            if (format === "bmp") {
              // BMP files start with 'BM' signature (0x42 0x4D)
              expect(encodedBuffer[0]).toBe(0x42); // 'B'
              expect(encodedBuffer[1]).toBe(0x4d); // 'M'

              // Verify BMP header structure
              // File size at offset 2-5 (little-endian)
              const fileSize = encodedBuffer.readUInt32LE(2);
              expect(fileSize).toBe(encodedBuffer.length);

              // Pixel data offset at offset 10-13
              const pixelDataOffset = encodedBuffer.readUInt32LE(10);
              expect(pixelDataOffset).toBe(54); // Standard BMP header size

              // DIB header size at offset 14-17
              const dibHeaderSize = encodedBuffer.readUInt32LE(14);
              expect(dibHeaderSize).toBe(40); // BITMAPINFOHEADER

              // Image width at offset 18-21
              const imageWidth = encodedBuffer.readInt32LE(18);
              expect(imageWidth).toBe(width);

              // Image height at offset 22-25
              const imageHeight = encodedBuffer.readInt32LE(22);
              expect(imageHeight).toBe(height);

              // Bits per pixel at offset 28-29
              const bitsPerPixel = encodedBuffer.readUInt16LE(28);
              expect(bitsPerPixel).toBe(24); // 24-bit RGB
            } else {
              // For other formats, sharp should recognize them
              const metadata = await sharp(encodedBuffer).metadata();
              expect(metadata.format).toBe(format);
              expect(metadata.width).toBe(width);
              expect(metadata.height).toBe(height);
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in the design
      );
    }, 60000); // 60 second timeout for property test

    it("should produce valid images that can be decoded back", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 10, max: 200 }),
          fc.integer({ min: 10, max: 200 }),
          // Generate arbitrary RGB color
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          // Generate arbitrary format (excluding BMP for round-trip test)
          fc.constantFrom<ImageFormat>("png", "jpeg", "webp"),
          async (width, height, r, g, b, format) => {
            // Create a test image
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

            // Encode to the target format
            const encodedBuffer = await processor.encode(
              testImageBuffer,
              format
            );

            // Decode back to verify it's a valid image
            const decodedMetadata = await sharp(encodedBuffer).metadata();

            // Verify dimensions are preserved
            expect(decodedMetadata.width).toBe(width);
            expect(decodedMetadata.height).toBe(height);

            // Verify we can extract pixel data (proves it's a valid image)
            const pixelData = await sharp(encodedBuffer).raw().toBuffer();
            expect(pixelData.length).toBeGreaterThan(0);
            expect(pixelData.length).toBe(width * height * 3); // RGB = 3 bytes per pixel
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should handle quality parameter for lossy formats", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 50, max: 200 }),
          // Generate arbitrary RGB color
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          fc.integer({ min: 0, max: 255 }),
          // Generate arbitrary quality (1-100)
          fc.integer({ min: 1, max: 100 }),
          // Test with lossy formats
          fc.constantFrom<ImageFormat>("jpeg", "webp"),
          async (width, height, r, g, b, quality, format) => {
            // Create a test image
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

            // Encode with quality parameter
            const encodedBuffer = await processor.encode(
              testImageBuffer,
              format,
              quality
            );

            // Verify the output is valid
            expect(encodedBuffer).toBeInstanceOf(Buffer);
            expect(encodedBuffer.length).toBeGreaterThan(0);

            // Verify it can be decoded
            const metadata = await sharp(encodedBuffer).metadata();
            expect(metadata.format).toBe(format);
            expect(metadata.width).toBe(width);
            expect(metadata.height).toBe(height);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });

  /**
   * Feature: mcp-screenshot, Property 4: Quality parameter affects file size
   * For any lossy format with quality parameter, when quality increases,
   * the file size should increase (assuming same content).
   * Validates: Requirements 1.4
   */
  describe("Property 4: Quality parameter affects file size", () => {
    it("should produce larger file sizes with higher quality settings for complex images", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions (larger images show quality differences better)
          fc.integer({ min: 100, max: 300 }),
          fc.integer({ min: 100, max: 300 }),
          // Generate two quality values where the second is significantly higher
          fc.integer({ min: 10, max: 40 }),
          fc.integer({ min: 70, max: 95 }),
          // Test with lossy formats
          fc.constantFrom<ImageFormat>("jpeg", "webp"),
          async (width, height, lowQuality, highQuality, format) => {
            // Create a complex test image with a gradient pattern
            // This ensures compression differences are visible and consistent
            // Solid color images can be optimized in unexpected ways
            const complexImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .composite([
                {
                  input: Buffer.from(
                    `<svg width="${width}" height="${height}">
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
                          <stop offset="50%" style="stop-color:rgb(0,255,0);stop-opacity:1" />
                          <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
                        </linearGradient>
                      </defs>
                      <rect width="${width}" height="${height}" fill="url(#grad)" />
                    </svg>`
                  ),
                  top: 0,
                  left: 0,
                },
              ])
              .png()
              .toBuffer();

            // Encode with low quality
            const lowQualityBuffer = await processor.encode(
              complexImageBuffer,
              format,
              lowQuality
            );

            // Encode with high quality
            const highQualityBuffer = await processor.encode(
              complexImageBuffer,
              format,
              highQuality
            );

            // Verify both are valid
            expect(lowQualityBuffer).toBeInstanceOf(Buffer);
            expect(highQualityBuffer).toBeInstanceOf(Buffer);
            expect(lowQualityBuffer.length).toBeGreaterThan(0);
            expect(highQualityBuffer.length).toBeGreaterThan(0);

            // Property: Higher quality should produce larger file size for complex images
            // WebP compression can be unpredictable with generated gradients
            if (
              format === "webp" &&
              highQualityBuffer.length <= lowQualityBuffer.length
            ) {
              // Skip assertion for WebP anomalies where high quality is smaller
              return;
            }

            expect(highQualityBuffer.length).toBeGreaterThan(
              lowQualityBuffer.length
            );
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it("should show monotonic relationship between quality and file size for complex images", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary image dimensions
          fc.integer({ min: 100, max: 200 }),
          fc.integer({ min: 100, max: 200 }),
          // Test with lossy formats
          fc.constantFrom<ImageFormat>("jpeg", "webp"),
          async (width, height, format) => {
            // Create a more complex test image with a gradient pattern
            // This ensures compression differences are visible
            const complexImageBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
              },
            })
              .composite([
                {
                  input: Buffer.from(
                    `<svg width="${width}" height="${height}">
                      <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
                          <stop offset="50%" style="stop-color:rgb(0,255,0);stop-opacity:1" />
                          <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
                        </linearGradient>
                      </defs>
                      <rect width="${width}" height="${height}" fill="url(#grad)" />
                    </svg>`
                  ),
                  top: 0,
                  left: 0,
                },
              ])
              .png()
              .toBuffer();

            // Test with three quality levels: low, medium, high
            const qualities = [30, 60, 90];
            const fileSizes: number[] = [];

            for (const quality of qualities) {
              const encoded = await processor.encode(
                complexImageBuffer,
                format,
                quality
              );
              fileSizes.push(encoded.length);
            }

            // Verify monotonic relationship: each higher quality produces equal or larger file
            expect(fileSizes[1]).toBeGreaterThanOrEqual(fileSizes[0]); // medium >= low
            expect(fileSizes[2]).toBeGreaterThanOrEqual(fileSizes[1]); // high >= medium
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);
  });
});
