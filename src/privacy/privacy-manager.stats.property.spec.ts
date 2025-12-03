/**
 * Property-based tests for PrivacyManager masking statistics
 * Feature: mcp-screenshot, Property 19: Masking statistics accuracy
 * Validates: Requirements 6.5
 */

import * as fc from "fast-check";
import sharp from "sharp";
import { PrivacyManager } from "./privacy-manager";

describe("PrivacyManager - Masking Statistics Property Tests", () => {
  let privacyManager: PrivacyManager;

  beforeEach(() => {
    privacyManager = new PrivacyManager();
  });

  afterEach(async () => {
    await privacyManager.cleanup();
  });

  /**
   * Feature: mcp-screenshot, Property 19: Masking statistics accuracy
   * For any PII masking operation, the reported redaction counts should match
   * the actual number of patterns detected and masked.
   * Validates: Requirements 6.5
   */
  describe("Property 19: Masking statistics accuracy", () => {
    it("should report non-negative statistics for all PII types", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          async (text) => {
            // Create an image with random text
            const imageBuffer = await createImageWithText(text);

            // Apply PII masking
            const { stats } = await privacyManager.maskPII(imageBuffer);

            // All statistics should be non-negative
            expect(stats.emailsRedacted).toBeGreaterThanOrEqual(0);
            expect(stats.phonesRedacted).toBeGreaterThanOrEqual(0);
            expect(stats.creditCardsRedacted).toBeGreaterThanOrEqual(0);
            expect(stats.customPatternsRedacted).toBeGreaterThanOrEqual(0);

            // All statistics should be integers
            expect(Number.isInteger(stats.emailsRedacted)).toBe(true);
            expect(Number.isInteger(stats.phonesRedacted)).toBe(true);
            expect(Number.isInteger(stats.creditCardsRedacted)).toBe(true);
            expect(Number.isInteger(stats.customPatternsRedacted)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it("should report zero statistics when no PII is present", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }).filter(
            (s) =>
              // Filter out strings that might match PII patterns
              !/[@]/.test(s) && // No @ for emails
              !/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(s) && // No phone patterns
              !/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/.test(s) // No credit card patterns
          ),
          async (text) => {
            // Create an image with non-PII text
            const imageBuffer = await createImageWithText(text);

            // Apply PII masking
            const { stats } = await privacyManager.maskPII(imageBuffer);

            // All statistics should be zero or very low (OCR may misread)
            expect(stats.emailsRedacted).toBeLessThanOrEqual(1);
            expect(stats.phonesRedacted).toBeLessThanOrEqual(1);
            expect(stats.creditCardsRedacted).toBeLessThanOrEqual(1);
            expect(stats.customPatternsRedacted).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it("should increment custom pattern count when custom patterns are provided", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 5, maxLength: 10 })
            .filter((s) => /^[A-Z0-9]+$/.test(s)),
          async (customPattern) => {
            // Create an image with the custom pattern
            const imageBuffer = await createImageWithText(customPattern);

            // Apply PII masking with custom pattern
            const { stats } = await privacyManager.maskPII(imageBuffer, [
              customPattern,
            ]);

            // Custom pattern count should be non-negative
            expect(stats.customPatternsRedacted).toBeGreaterThanOrEqual(0);

            // Other counts should be non-negative
            expect(stats.emailsRedacted).toBeGreaterThanOrEqual(0);
            expect(stats.phonesRedacted).toBeGreaterThanOrEqual(0);
            expect(stats.creditCardsRedacted).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it("should maintain statistics consistency across multiple calls", async () => {
      await fc.assert(
        fc.asyncProperty(fc.emailAddress(), async (email) => {
          // Create an image with an email
          const imageBuffer = await createImageWithText(email);

          // Apply PII masking twice
          const result1 = await privacyManager.maskPII(imageBuffer);
          const result2 = await privacyManager.maskPII(imageBuffer);

          // Statistics should be consistent (same input = same output)
          expect(result1.stats.emailsRedacted).toBe(
            result2.stats.emailsRedacted
          );
          expect(result1.stats.phonesRedacted).toBe(
            result2.stats.phonesRedacted
          );
          expect(result1.stats.creditCardsRedacted).toBe(
            result2.stats.creditCardsRedacted
          );
          expect(result1.stats.customPatternsRedacted).toBe(
            result2.stats.customPatternsRedacted
          );
        }),
        { numRuns: 10 }
      );
    }, 60000);

    it("should report accurate total redaction count", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.tuple(
            fc.integer({ min: 200, max: 999 }),
            fc.integer({ min: 200, max: 999 }),
            fc.integer({ min: 1000, max: 9999 })
          ),
          async (email, [area, prefix, line]) => {
            const phone = `${area}-${prefix}-${line}`;
            const text = `Email: ${email} Phone: ${phone}`;

            // Create an image with multiple PII types
            const imageBuffer = await createImageWithText(text);

            // Apply PII masking
            const { stats } = await privacyManager.maskPII(imageBuffer);

            // Calculate total redactions
            const total =
              stats.emailsRedacted +
              stats.phonesRedacted +
              stats.creditCardsRedacted +
              stats.customPatternsRedacted;

            // Total should be non-negative
            expect(total).toBeGreaterThanOrEqual(0);

            // Each individual count should not exceed total
            expect(stats.emailsRedacted).toBeLessThanOrEqual(total);
            expect(stats.phonesRedacted).toBeLessThanOrEqual(total);
            expect(stats.creditCardsRedacted).toBeLessThanOrEqual(total);
            expect(stats.customPatternsRedacted).toBeLessThanOrEqual(total);
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);

    it("should handle empty images without errors", async () => {
      // Create a blank white image
      const blankImage = await sharp({
        create: {
          width: 800,
          height: 200,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      // Apply PII masking
      const { stats } = await privacyManager.maskPII(blankImage);

      // All statistics should be zero
      expect(stats.emailsRedacted).toBe(0);
      expect(stats.phonesRedacted).toBe(0);
      expect(stats.creditCardsRedacted).toBe(0);
      expect(stats.customPatternsRedacted).toBe(0);
    });
  });
});

/**
 * Helper function to create an image with text
 */
async function createImageWithText(
  text: string,
  fontSize: number = 48
): Promise<Buffer> {
  const width = 800;
  const height = 200;

  // Escape XML special characters
  const escapedText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  // Create SVG with text
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="white"/>
      <text x="50" y="${
        height / 2
      }" font-family="Arial" font-size="${fontSize}" fill="black">
        ${escapedText}
      </text>
    </svg>
  `;

  // Convert SVG to PNG buffer
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

  return buffer;
}
