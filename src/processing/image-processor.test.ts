/**
 * Basic tests for ImageProcessor
 */

import { ImageProcessor } from "./image-processor";
import sharp from "sharp";

describe("ImageProcessor", () => {
  let processor: ImageProcessor;
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    processor = new ImageProcessor();
    // Create a simple test image (100x100 red square)
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
  });

  describe("encode", () => {
    it("should encode to PNG format", async () => {
      const result = await processor.encode(testImageBuffer, "png");
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("png");
    });

    it("should encode to JPEG format", async () => {
      const result = await processor.encode(testImageBuffer, "jpeg", 90);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("jpeg");
    });

    it("should encode to WebP format", async () => {
      const result = await processor.encode(testImageBuffer, "webp", 90);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("webp");
    });

    it("should encode to BMP format", async () => {
      const result = await processor.encode(testImageBuffer, "bmp");
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // BMP signature check
      expect(result[0]).toBe(0x42); // 'B'
      expect(result[1]).toBe(0x4d); // 'M'
    });
  });

  describe("crop", () => {
    it("should crop image to specified region", async () => {
      const result = await processor.crop(testImageBuffer, 10, 10, 50, 50);
      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });

    it("should throw error for negative coordinates", async () => {
      await expect(
        processor.crop(testImageBuffer, -10, 10, 50, 50)
      ).rejects.toThrow("Crop coordinates must be non-negative");
    });

    it("should throw error for zero dimensions", async () => {
      await expect(
        processor.crop(testImageBuffer, 10, 10, 0, 50)
      ).rejects.toThrow("Crop dimensions must be positive");
    });
  });

  describe("resize", () => {
    it("should resize image to specified dimensions", async () => {
      const result = await processor.resize(testImageBuffer, 200, 200);
      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it("should throw error for zero dimensions", async () => {
      await expect(processor.resize(testImageBuffer, 0, 100)).rejects.toThrow(
        "Resize dimensions must be positive"
      );
    });
  });

  describe("getMetadata", () => {
    it("should return correct metadata", async () => {
      const metadata = await processor.getMetadata(testImageBuffer);

      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
      expect(metadata.format).toBe("png");
      expect(metadata.size).toBe(testImageBuffer.length);
    });
  });

  describe("convertFormat", () => {
    it("should convert PNG to JPEG", async () => {
      const result = await processor.convertFormat(testImageBuffer, "jpeg", 90);
      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe("jpeg");
    });

    it("should convert PNG to WebP", async () => {
      const result = await processor.convertFormat(testImageBuffer, "webp", 90);
      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe("webp");
    });
  });

  describe("optimize", () => {
    it("should optimize image and return smallest format", async () => {
      const result = await processor.optimize(testImageBuffer);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.format).toMatch(/^(png|jpeg|webp)$/);
      expect(result.size).toBe(result.buffer.length);
      expect(result.size).toBeLessThanOrEqual(testImageBuffer.length);
    });

    it("should respect max file size constraint", async () => {
      const maxSize = 1000; // 1KB
      const result = await processor.optimize(testImageBuffer, maxSize);

      expect(result.size).toBeLessThanOrEqual(maxSize);
    });
  });
});
