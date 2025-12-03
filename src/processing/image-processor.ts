/**
 * Image processing implementation using sharp
 */

import sharp from "sharp";
import { IImageProcessor } from "../interfaces";
import { ImageFormat } from "../types";
import { UnsupportedFormatError, EncodingFailedError } from "../errors";

/**
 * Image processor implementation with comprehensive format support,
 * compression, cropping, resizing, and metadata extraction
 */
export class ImageProcessor implements IImageProcessor {
  /**
   * Encode an image buffer to a specific format with quality settings
   *
   * Supports:
   * - PNG: Lossless compression with configurable compression level (0-9)
   * - JPEG: Lossy compression with quality parameter (1-100)
   * - WebP: Both lossy and lossless compression with quality parameter
   * - BMP: Uncompressed bitmap format
   *
   * @param buffer Input image buffer
   * @param format Target format (png, jpeg, webp, bmp)
   * @param quality Quality setting (1-100 for lossy formats, 0-9 for PNG compression level)
   * @returns Encoded image buffer
   * @throws UnsupportedFormatError if format is not supported
   */
  async encode(
    buffer: Buffer,
    format: ImageFormat,
    quality?: number
  ): Promise<Buffer> {
    try {
      const image = sharp(buffer);

      switch (format) {
        case "png":
          // PNG uses lossless compression
          // Quality parameter maps to compression level (0-9)
          // Higher compression = smaller file but slower encoding
          const compressionLevel =
            quality !== undefined
              ? Math.max(0, Math.min(9, Math.floor(quality / 11))) // Map 0-100 to 0-9
              : 9; // Default to maximum compression
          return image
            .png({
              compressionLevel,
              adaptiveFiltering: true, // Better compression
              palette: false, // Use full color depth
            })
            .toBuffer();

        case "jpeg":
          // JPEG uses lossy compression
          // Quality parameter directly controls quality (1-100)
          const jpegQuality =
            quality !== undefined ? Math.max(1, Math.min(100, quality)) : 90; // Default to high quality
          return image
            .jpeg({
              quality: jpegQuality,
              mozjpeg: true, // Use mozjpeg for better compression
              chromaSubsampling: jpegQuality >= 90 ? "4:4:4" : "4:2:0", // Better quality at high settings
            })
            .toBuffer();

        case "webp":
          // WebP supports both lossy and lossless compression
          // Quality parameter controls lossy quality (1-100)
          // Quality 100 uses lossless mode
          const webpQuality =
            quality !== undefined ? Math.max(1, Math.min(100, quality)) : 90; // Default to high quality
          return image
            .webp({
              quality: webpQuality,
              lossless: webpQuality === 100, // Use lossless at quality 100
              nearLossless: webpQuality >= 95 && webpQuality < 100, // Near-lossless for very high quality
              smartSubsample: true, // Better quality
            })
            .toBuffer();

        case "bmp":
          // BMP is uncompressed format
          // Sharp doesn't have native BMP output, so we use raw format
          // and construct BMP header manually
          const rawData = await image
            .raw()
            .toBuffer({ resolveWithObject: true });
          return this.createBMPBuffer(rawData);

        default:
          throw new UnsupportedFormatError(`Unsupported format: ${format}`);
      }
    } catch (error) {
      if (error instanceof UnsupportedFormatError) {
        throw error;
      }
      throw new EncodingFailedError(
        `Failed to encode image to ${format}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { format, quality, originalError: error }
      );
    }
  }

  /**
   * Create a BMP buffer from raw image data
   * BMP format structure:
   * - File header (14 bytes)
   * - DIB header (40 bytes for BITMAPINFOHEADER)
   * - Pixel data (bottom-up, BGR format, padded to 4-byte boundaries)
   *
   * @param rawData Raw image data with metadata
   * @returns BMP formatted buffer
   */
  private createBMPBuffer(rawData: {
    data: Buffer;
    info: sharp.OutputInfo;
  }): Buffer {
    const { data, info } = rawData;
    const { width, height, channels } = info;

    // Calculate row size with padding (must be multiple of 4)
    const bytesPerPixel = 3; // BMP uses BGR (24-bit)
    const rowSize = Math.floor((bytesPerPixel * width + 3) / 4) * 4;
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (DIB header) + pixel data

    const buffer = Buffer.alloc(fileSize);
    let offset = 0;

    // BMP File Header (14 bytes)
    buffer.write("BM", offset);
    offset += 2; // Signature
    buffer.writeUInt32LE(fileSize, offset);
    offset += 4; // File size
    buffer.writeUInt32LE(0, offset);
    offset += 4; // Reserved
    buffer.writeUInt32LE(54, offset);
    offset += 4; // Pixel data offset

    // DIB Header (BITMAPINFOHEADER - 40 bytes)
    buffer.writeUInt32LE(40, offset);
    offset += 4; // Header size
    buffer.writeInt32LE(width, offset);
    offset += 4; // Width
    buffer.writeInt32LE(height, offset);
    offset += 4; // Height (positive = bottom-up)
    buffer.writeUInt16LE(1, offset);
    offset += 2; // Planes
    buffer.writeUInt16LE(24, offset);
    offset += 2; // Bits per pixel
    buffer.writeUInt32LE(0, offset);
    offset += 4; // Compression (0 = none)
    buffer.writeUInt32LE(pixelDataSize, offset);
    offset += 4; // Image size
    buffer.writeInt32LE(2835, offset);
    offset += 4; // X pixels per meter (72 DPI)
    buffer.writeInt32LE(2835, offset);
    offset += 4; // Y pixels per meter (72 DPI)
    buffer.writeUInt32LE(0, offset);
    offset += 4; // Colors in palette
    buffer.writeUInt32LE(0, offset);
    offset += 4; // Important colors

    // Convert pixel data from RGB(A) to BGR and write bottom-up
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const srcOffset = (y * width + x) * channels;
        const r = data[srcOffset];
        const g = data[srcOffset + 1];
        const b = data[srcOffset + 2];

        // Write BGR
        buffer[offset++] = b;
        buffer[offset++] = g;
        buffer[offset++] = r;
      }

      // Add row padding
      const padding = rowSize - width * bytesPerPixel;
      for (let p = 0; p < padding; p++) {
        buffer[offset++] = 0;
      }
    }

    return buffer;
  }

  /**
   * Crop an image to a specific region
   *
   * @param buffer Input image buffer
   * @param x X coordinate (left edge)
   * @param y Y coordinate (top edge)
   * @param width Width of the region
   * @param height Height of the region
   * @returns Cropped image buffer
   */
  async crop(
    buffer: Buffer,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    // Validate parameters
    if (x < 0 || y < 0) {
      throw new Error("Crop coordinates must be non-negative");
    }
    if (width <= 0 || height <= 0) {
      throw new Error("Crop dimensions must be positive");
    }

    return sharp(buffer)
      .extract({
        left: Math.floor(x),
        top: Math.floor(y),
        width: Math.floor(width),
        height: Math.floor(height),
      })
      .toBuffer();
  }

  /**
   * Resize an image to specific dimensions
   * Uses high-quality Lanczos3 resampling by default
   *
   * @param buffer Input image buffer
   * @param width Target width
   * @param height Target height
   * @returns Resized image buffer
   */
  async resize(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    // Validate parameters
    if (width <= 0 || height <= 0) {
      throw new Error("Resize dimensions must be positive");
    }

    return sharp(buffer)
      .resize(Math.floor(width), Math.floor(height), {
        kernel: sharp.kernel.lanczos3, // High-quality resampling
        fit: "fill", // Exact dimensions, may distort aspect ratio
      })
      .toBuffer();
  }

  /**
   * Get comprehensive image metadata
   *
   * @param buffer Input image buffer
   * @returns Metadata including dimensions, format, and file size
   */
  async getMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
      size: buffer.length,
    };
  }

  /**
   * Convert image from one format to another
   * Applies format-specific optimizations
   *
   * @param buffer Input image buffer
   * @param targetFormat Target format
   * @param quality Optional quality setting
   * @returns Converted image buffer
   */
  async convertFormat(
    buffer: Buffer,
    targetFormat: ImageFormat,
    quality?: number
  ): Promise<Buffer> {
    return this.encode(buffer, targetFormat, quality);
  }

  /**
   * Optimize image file size while maintaining acceptable quality
   * Tries different formats and quality settings to find the smallest file
   *
   * @param buffer Input image buffer
   * @param maxFileSize Maximum file size in bytes (optional)
   * @returns Optimized image buffer and format used
   */
  async optimize(
    buffer: Buffer,
    maxFileSize?: number
  ): Promise<{ buffer: Buffer; format: ImageFormat; size: number }> {
    const formats: ImageFormat[] = ["webp", "jpeg", "png"];
    let bestResult = {
      buffer,
      format: "png" as ImageFormat,
      size: buffer.length,
    };

    for (const format of formats) {
      try {
        // Try with high quality first
        let encoded = await this.encode(buffer, format, 90);

        // If we have a max file size constraint, reduce quality until we meet it
        if (maxFileSize && encoded.length > maxFileSize) {
          let quality = 80;
          while (quality >= 50 && encoded.length > maxFileSize) {
            encoded = await this.encode(buffer, format, quality);
            quality -= 10;
          }
        }

        // Keep track of the smallest result
        if (encoded.length < bestResult.size) {
          bestResult = { buffer: encoded, format, size: encoded.length };
        }
      } catch (error) {
        // Skip formats that fail
        continue;
      }
    }

    return bestResult;
  }
}
