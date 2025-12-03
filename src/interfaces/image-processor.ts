/**
 * Interface for image processing operations
 */

import { ImageFormat } from "../types";

/**
 * Image processing interface
 */
export interface IImageProcessor {
  /**
   * Encode an image buffer to a specific format
   * @param buffer Input image buffer
   * @param format Target format
   * @param quality Quality setting (1-100 for lossy formats)
   * @returns Encoded image buffer
   */
  encode(
    buffer: Buffer,
    format: ImageFormat,
    quality?: number
  ): Promise<Buffer>;

  /**
   * Crop an image to a specific region
   * @param buffer Input image buffer
   * @param x X coordinate
   * @param y Y coordinate
   * @param width Width of the region
   * @param height Height of the region
   * @returns Cropped image buffer
   */
  crop(
    buffer: Buffer,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer>;

  /**
   * Resize an image
   * @param buffer Input image buffer
   * @param width Target width
   * @param height Target height
   * @returns Resized image buffer
   */
  resize(buffer: Buffer, width: number, height: number): Promise<Buffer>;

  /**
   * Get image metadata
   * @param buffer Input image buffer
   * @returns Image metadata including dimensions and format
   */
  getMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }>;

  /**
   * Convert image format
   * @param buffer Input image buffer
   * @param targetFormat Target format
   * @param quality Optional quality setting
   * @returns Converted image buffer
   */
  convertFormat(
    buffer: Buffer,
    targetFormat: ImageFormat,
    quality?: number
  ): Promise<Buffer>;

  /**
   * Optimize image file size
   * @param buffer Input image buffer
   * @param maxFileSize Maximum file size in bytes (optional)
   * @returns Optimized image buffer with format and size information
   */
  optimize(
    buffer: Buffer,
    maxFileSize?: number
  ): Promise<{ buffer: Buffer; format: ImageFormat; size: number }>;
}
