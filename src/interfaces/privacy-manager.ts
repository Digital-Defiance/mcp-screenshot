/**
 * Interface for PII detection and masking
 */

import { MaskingStats } from "../types";

/**
 * Privacy manager interface for PII detection and masking
 */
export interface IPrivacyManager {
  /**
   * Detect and mask PII in an image
   * @param buffer Input image buffer
   * @param patterns Optional custom patterns to detect
   * @returns Masked image buffer and statistics
   */
  maskPII(
    buffer: Buffer,
    patterns?: string[]
  ): Promise<{
    maskedBuffer: Buffer;
    stats: MaskingStats;
  }>;

  /**
   * Detect text in an image using OCR
   * @param buffer Input image buffer
   * @returns Detected text with bounding boxes
   */
  detectText(buffer: Buffer): Promise<
    Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
    }>
  >;

  /**
   * Check if a window should be excluded based on title
   * @param windowTitle Window title
   * @returns True if window should be excluded
   */
  shouldExcludeWindow(windowTitle: string): boolean;

  /**
   * Apply black boxes over specified regions
   * @param buffer Input image buffer
   * @param regions Regions to mask
   * @returns Masked image buffer
   */
  applyMasks(
    buffer: Buffer,
    regions: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<Buffer>;
}
