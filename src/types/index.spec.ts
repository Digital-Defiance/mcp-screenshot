/**
 * Basic test to verify testing infrastructure
 */

import * as fc from "fast-check";
import { ImageFormat } from "./index";

describe("Types", () => {
  describe("ImageFormat", () => {
    it("should be one of the supported formats", () => {
      const supportedFormats: ImageFormat[] = ["png", "jpeg", "webp", "bmp"];

      supportedFormats.forEach((format) => {
        expect(["png", "jpeg", "webp", "bmp"]).toContain(format);
      });
    });
  });

  describe("Property-based testing setup", () => {
    it("should run property-based tests with fast-check", () => {
      // Simple property test to verify fast-check is working
      fc.assert(
        fc.property(fc.integer(), (n) => {
          return n + 0 === n;
        }),
        { numRuns: 100 }
      );
    });

    it("should generate valid image formats", () => {
      const formatArbitrary = fc.constantFrom<ImageFormat>(
        "png",
        "jpeg",
        "webp",
        "bmp"
      );

      fc.assert(
        fc.property(formatArbitrary, (format) => {
          return ["png", "jpeg", "webp", "bmp"].includes(format);
        }),
        { numRuns: 100 }
      );
    });
  });
});
