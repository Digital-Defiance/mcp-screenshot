/**
 * Privacy manager for PII detection and masking
 */

import { createWorker, Worker } from "tesseract.js";
import sharp from "sharp";
import { IPrivacyManager } from "../interfaces";
import { MaskingStats } from "../types";

/**
 * PII pattern definitions
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone:
    /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
};

/**
 * Default window exclusion patterns for password managers and auth dialogs
 */
const DEFAULT_EXCLUDED_PATTERNS = [
  ".*password.*",
  ".*1password.*",
  ".*lastpass.*",
  ".*bitwarden.*",
  ".*keepass.*",
  ".*dashlane.*",
  ".*authentication.*",
  ".*login.*",
  ".*sign in.*",
  ".*credential.*",
];

/**
 * Privacy manager implementation
 */
export class PrivacyManager implements IPrivacyManager {
  private excludedPatterns: string[] = [];
  private ocrWorker: Worker | null = null;

  constructor(excludedPatterns: string[] = []) {
    this.excludedPatterns = [...DEFAULT_EXCLUDED_PATTERNS, ...excludedPatterns];
  }

  /**
   * Initialize OCR worker
   */
  private async initOCRWorker(): Promise<Worker> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker("eng");
    }
    return this.ocrWorker;
  }

  /**
   * Cleanup OCR worker
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }

  /**
   * Detect and mask PII in an image
   */
  async maskPII(
    buffer: Buffer,
    patterns?: string[]
  ): Promise<{
    maskedBuffer: Buffer;
    stats: MaskingStats;
  }> {
    const stats: MaskingStats = {
      emailsRedacted: 0,
      phonesRedacted: 0,
      creditCardsRedacted: 0,
      customPatternsRedacted: 0,
    };

    // Detect text with bounding boxes
    const detectedText = await this.detectText(buffer);

    // Find regions to mask
    const regionsToMask: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (const item of detectedText) {
      const text = item.text;

      // Check for emails
      const emailMatches = text.match(PII_PATTERNS.email);
      if (emailMatches && emailMatches.length > 0) {
        stats.emailsRedacted += emailMatches.length;
        regionsToMask.push(item.bounds);
      }

      // Check for phone numbers
      const phoneMatches = text.match(PII_PATTERNS.phone);
      if (phoneMatches && phoneMatches.length > 0) {
        stats.phonesRedacted += phoneMatches.length;
        regionsToMask.push(item.bounds);
      }

      // Check for credit cards
      const ccMatches = text.match(PII_PATTERNS.creditCard);
      if (ccMatches && ccMatches.length > 0) {
        stats.creditCardsRedacted += ccMatches.length;
        regionsToMask.push(item.bounds);
      }

      // Check for custom patterns
      if (patterns && patterns.length > 0) {
        for (const pattern of patterns) {
          const regex = new RegExp(pattern, "g");
          const customMatches = text.match(regex);
          if (customMatches && customMatches.length > 0) {
            stats.customPatternsRedacted += customMatches.length;
            regionsToMask.push(item.bounds);
            break; // Only count once per text item
          }
        }
      }
    }

    // Apply masks if any PII was detected
    const maskedBuffer =
      regionsToMask.length > 0
        ? await this.applyMasks(buffer, regionsToMask)
        : buffer;

    return {
      maskedBuffer,
      stats,
    };
  }

  /**
   * Detect text in an image using OCR
   */
  async detectText(buffer: Buffer): Promise<
    Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
    }>
  > {
    const worker = await this.initOCRWorker();

    // Convert buffer to format Tesseract can process
    const {
      data: { words },
    } = await worker.recognize(buffer);

    // Group words into lines for better PII detection
    const lines: Map<
      number,
      Array<{
        text: string;
        bounds: { x: number; y: number; width: number; height: number };
      }>
    > = new Map();

    for (const word of words) {
      if (!word.text || word.text.trim().length === 0) continue;

      const lineY = Math.round(word.bbox.y0 / 10) * 10; // Group by approximate line
      if (!lines.has(lineY)) {
        lines.set(lineY, []);
      }

      lines.get(lineY)!.push({
        text: word.text,
        bounds: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
      });
    }

    // Combine words in each line
    const result: Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
    }> = [];

    for (const lineWords of lines.values()) {
      if (lineWords.length === 0) continue;

      // Sort words by x position
      lineWords.sort((a, b) => a.bounds.x - b.bounds.x);

      // Combine into line text
      const lineText = lineWords.map((w) => w.text).join(" ");

      // Calculate bounding box for entire line
      const minX = Math.min(...lineWords.map((w) => w.bounds.x));
      const minY = Math.min(...lineWords.map((w) => w.bounds.y));
      const maxX = Math.max(
        ...lineWords.map((w) => w.bounds.x + w.bounds.width)
      );
      const maxY = Math.max(
        ...lineWords.map((w) => w.bounds.y + w.bounds.height)
      );

      result.push({
        text: lineText,
        bounds: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        },
      });
    }

    return result;
  }

  /**
   * Check if a window should be excluded based on title
   */
  shouldExcludeWindow(windowTitle: string): boolean {
    return this.excludedPatterns.some((pattern) => {
      const regex = new RegExp(pattern, "i");
      return regex.test(windowTitle);
    });
  }

  /**
   * Apply black boxes over specified regions
   */
  async applyMasks(
    buffer: Buffer,
    regions: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<Buffer> {
    if (regions.length === 0) {
      return buffer;
    }

    // Get image metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to determine image dimensions");
    }

    // Create composites for each region (black rectangles)
    const composites = regions.map((region) => {
      // Ensure region is within image bounds
      const x = Math.max(0, Math.floor(region.x));
      const y = Math.max(0, Math.floor(region.y));
      const width = Math.min(metadata.width! - x, Math.ceil(region.width));
      const height = Math.min(metadata.height! - y, Math.ceil(region.height));

      // Create black rectangle
      const blackBox = Buffer.from(
        `<svg width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="black"/>
        </svg>`
      );

      return {
        input: blackBox,
        top: y,
        left: x,
      };
    });

    // Apply all masks at once
    const maskedBuffer = await image.composite(composites).toBuffer();

    return maskedBuffer;
  }
}
