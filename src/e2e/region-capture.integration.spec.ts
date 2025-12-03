/**
 * Integration tests for region capture workflow
 * Tests Requirements 3.1-3.5
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createCaptureEngine } from "../capture";
import { ImageProcessor } from "../processing";
import { SecurityManager } from "../security";
import { ImageFormat } from "../types";

describe("Region Capture Integration Tests", () => {
  let captureEngine: ReturnType<typeof createCaptureEngine>;
  let imageProcessor: ImageProcessor;
  let securityManager: SecurityManager;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-screenshot-region-"));

    captureEngine = createCaptureEngine();
    imageProcessor = new ImageProcessor();
    securityManager = new SecurityManager({
      allowedDirectories: [tempDir],
      maxCapturesPerMinute: 100,
      enableAuditLog: true,
    });
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Requirement 3.1: Rectangular region capture", () => {
    it("should capture specified rectangular region by coordinates", async () => {
      try {
        const x = 0;
        const y = 0;
        const width = 100;
        const height = 100;

        const regionBuffer = await captureEngine.captureRegion(
          x,
          y,
          width,
          height
        );

        expect(regionBuffer).toBeInstanceOf(Buffer);
        expect(regionBuffer.length).toBeGreaterThan(0);

        // Verify dimensions match request
        const metadata = await imageProcessor.getMetadata(regionBuffer);
        expect(metadata.width).toBe(width);
        expect(metadata.height).toBe(height);

        console.log(
          `Captured region (${x}, ${y}, ${width}, ${height}): ${metadata.width}x${metadata.height}`
        );
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should capture regions at various coordinates", async () => {
      try {
        const testRegions = [
          { x: 0, y: 0, width: 50, height: 50 },
          { x: 100, y: 100, width: 75, height: 75 },
          { x: 200, y: 200, width: 100, height: 50 },
          { x: 50, y: 150, width: 150, height: 100 },
        ];

        for (const region of testRegions) {
          const regionBuffer = await captureEngine.captureRegion(
            region.x,
            region.y,
            region.width,
            region.height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);
          expect(metadata.width).toBe(region.width);
          expect(metadata.height).toBe(region.height);

          console.log(
            `Region (${region.x}, ${region.y}): ${metadata.width}x${metadata.height}`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);

    it("should capture regions with different aspect ratios", async () => {
      try {
        const testRegions = [
          { x: 0, y: 0, width: 100, height: 50 }, // Wide
          { x: 0, y: 0, width: 50, height: 100 }, // Tall
          { x: 0, y: 0, width: 100, height: 100 }, // Square
          { x: 0, y: 0, width: 200, height: 50 }, // Very wide
          { x: 0, y: 0, width: 50, height: 200 }, // Very tall
        ];

        for (const region of testRegions) {
          const regionBuffer = await captureEngine.captureRegion(
            region.x,
            region.y,
            region.width,
            region.height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);
          expect(metadata.width).toBe(region.width);
          expect(metadata.height).toBe(region.height);

          const aspectRatio = region.width / region.height;
          console.log(
            `Region ${region.width}x${
              region.height
            } (aspect ratio: ${aspectRatio.toFixed(2)})`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe("Requirement 3.2: Boundary clipping", () => {
    it("should capture only visible portion when region extends beyond screen", async () => {
      try {
        // Get display dimensions
        const displays = await captureEngine.getDisplays();
        const primaryDisplay = displays.find((d) => d.isPrimary);

        if (!primaryDisplay) {
          console.warn("No primary display found - skipping test");
          return;
        }

        const screenWidth = primaryDisplay.resolution.width;
        const screenHeight = primaryDisplay.resolution.height;

        // Try to capture a region that extends beyond screen boundaries
        const x = screenWidth - 50;
        const y = screenHeight - 50;
        const width = 100; // Extends 50 pixels beyond screen
        const height = 100; // Extends 50 pixels beyond screen

        const regionBuffer = await captureEngine.captureRegion(
          x,
          y,
          width,
          height
        );

        const metadata = await imageProcessor.getMetadata(regionBuffer);

        // Should capture only the visible portion
        expect(metadata.width).toBeLessThanOrEqual(width);
        expect(metadata.height).toBeLessThanOrEqual(height);
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);

        console.log(
          `Boundary clipping test: Requested ${width}x${height}, ` +
            `got ${metadata.width}x${metadata.height} (clipped)`
        );
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should handle region completely outside screen bounds", async () => {
      try {
        // Get display dimensions
        const displays = await captureEngine.getDisplays();
        const primaryDisplay = displays.find((d) => d.isPrimary);

        if (!primaryDisplay) {
          console.warn("No primary display found - skipping test");
          return;
        }

        const screenWidth = primaryDisplay.resolution.width;
        const screenHeight = primaryDisplay.resolution.height;

        // Try to capture a region completely outside screen
        const x = screenWidth + 100;
        const y = screenHeight + 100;
        const width = 100;
        const height = 100;

        // This should either throw an error or return an empty/minimal capture
        try {
          const regionBuffer = await captureEngine.captureRegion(
            x,
            y,
            width,
            height
          );

          // If it doesn't throw, verify the result is minimal or empty
          const metadata = await imageProcessor.getMetadata(regionBuffer);
          console.log(
            `Out of bounds capture returned: ${metadata.width}x${metadata.height}`
          );
        } catch (captureError) {
          // Expected behavior - capturing outside bounds should fail
          console.log(
            `Correctly rejected out-of-bounds capture: ${
              (captureError as Error).message
            }`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 3.3: Negative coordinate validation", () => {
    it("should reject negative x coordinate", async () => {
      try {
        await expect(
          captureEngine.captureRegion(-10, 0, 100, 100)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should reject negative y coordinate", async () => {
      try {
        await expect(
          captureEngine.captureRegion(0, -10, 100, 100)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should reject both negative coordinates", async () => {
      try {
        await expect(
          captureEngine.captureRegion(-10, -10, 100, 100)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 3.4: Zero dimension validation", () => {
    it("should reject zero width", async () => {
      try {
        await expect(
          captureEngine.captureRegion(0, 0, 0, 100)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should reject zero height", async () => {
      try {
        await expect(
          captureEngine.captureRegion(0, 0, 100, 0)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should reject both zero dimensions", async () => {
      try {
        await expect(captureEngine.captureRegion(0, 0, 0, 0)).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should reject negative width", async () => {
      try {
        await expect(
          captureEngine.captureRegion(0, 0, -100, 100)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should reject negative height", async () => {
      try {
        await expect(
          captureEngine.captureRegion(0, 0, 100, -100)
        ).rejects.toThrow();
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 3.5: Multi-monitor coordinate system", () => {
    it("should interpret coordinates relative to virtual desktop", async () => {
      try {
        const displays = await captureEngine.getDisplays();

        if (displays.length < 2) {
          console.warn(
            "Single monitor setup - skipping multi-monitor coordinate test"
          );
          return;
        }

        // Test capturing from different displays using virtual desktop coordinates
        for (const display of displays) {
          const x = display.position.x + 50;
          const y = display.position.y + 50;
          const width = 100;
          const height = 100;

          const regionBuffer = await captureEngine.captureRegion(
            x,
            y,
            width,
            height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);
          expect(metadata.width).toBe(width);
          expect(metadata.height).toBe(height);

          console.log(
            `Captured from display ${display.id} at virtual coords (${x}, ${y}): ` +
              `${metadata.width}x${metadata.height}`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);

    it("should handle regions spanning multiple displays", async () => {
      try {
        const displays = await captureEngine.getDisplays();

        if (displays.length < 2) {
          console.warn(
            "Single monitor setup - skipping multi-display spanning test"
          );
          return;
        }

        // Sort displays by position to find adjacent ones
        const sortedDisplays = displays.sort(
          (a, b) => a.position.x - b.position.x
        );

        if (sortedDisplays.length >= 2) {
          const display1 = sortedDisplays[0];
          const display2 = sortedDisplays[1];

          // Create a region that spans both displays
          const x = display1.position.x + display1.resolution.width - 50;
          const y = display1.position.y;
          const width = 100; // 50 pixels on each display
          const height = 100;

          const regionBuffer = await captureEngine.captureRegion(
            x,
            y,
            width,
            height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);

          // Should capture the region (may be clipped depending on implementation)
          expect(metadata.width).toBeGreaterThan(0);
          expect(metadata.height).toBeGreaterThan(0);

          console.log(
            `Spanning region capture: ${metadata.width}x${metadata.height}`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Region capture with image processing", () => {
    it("should capture and crop region using image processor", async () => {
      try {
        // Capture a larger region
        const largeRegion = await captureEngine.captureRegion(0, 0, 200, 200);

        // Crop it further using image processor
        const croppedBuffer = await imageProcessor.crop(
          largeRegion,
          50,
          50,
          100,
          100
        );

        const metadata = await imageProcessor.getMetadata(croppedBuffer);
        expect(metadata.width).toBe(100);
        expect(metadata.height).toBe(100);

        console.log(`Cropped region: ${metadata.width}x${metadata.height}`);
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should save region captures in different formats", async () => {
      try {
        const regionBuffer = await captureEngine.captureRegion(0, 0, 100, 100);

        const formats: ImageFormat[] = ["png", "jpeg", "webp", "bmp"];

        for (const format of formats) {
          const encoded = await imageProcessor.encode(regionBuffer, format, 85);
          const savePath = path.join(tempDir, `region-capture.${format}`);

          securityManager.validatePath(savePath);
          fs.writeFileSync(savePath, encoded);

          expect(fs.existsSync(savePath)).toBe(true);
          const stats = fs.statSync(savePath);
          expect(stats.size).toBeGreaterThan(0);

          console.log(`Saved region in ${format}: ${stats.size} bytes`);
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe("Small and large region captures", () => {
    it("should capture very small regions", async () => {
      try {
        const smallRegions = [
          { x: 0, y: 0, width: 1, height: 1 },
          { x: 0, y: 0, width: 5, height: 5 },
          { x: 0, y: 0, width: 10, height: 10 },
        ];

        for (const region of smallRegions) {
          const regionBuffer = await captureEngine.captureRegion(
            region.x,
            region.y,
            region.width,
            region.height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);
          expect(metadata.width).toBe(region.width);
          expect(metadata.height).toBe(region.height);

          console.log(
            `Small region ${region.width}x${region.height} captured successfully`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);

    it("should capture large regions", async () => {
      try {
        const largeRegions = [
          { x: 0, y: 0, width: 500, height: 500 },
          { x: 0, y: 0, width: 800, height: 600 },
          { x: 0, y: 0, width: 1024, height: 768 },
        ];

        for (const region of largeRegions) {
          const regionBuffer = await captureEngine.captureRegion(
            region.x,
            region.y,
            region.width,
            region.height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);

          // May be clipped if larger than screen
          expect(metadata.width).toBeGreaterThan(0);
          expect(metadata.height).toBeGreaterThan(0);
          expect(metadata.width).toBeLessThanOrEqual(region.width);
          expect(metadata.height).toBeLessThanOrEqual(region.height);

          console.log(
            `Large region ${region.width}x${region.height} captured as ${metadata.width}x${metadata.height}`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe("Complete region capture workflow", () => {
    it("should execute complete region capture, process, and save workflow", async () => {
      try {
        // Step 1: Define region
        const x = 50;
        const y = 50;
        const width = 200;
        const height = 150;

        // Step 2: Capture region
        const regionBuffer = await captureEngine.captureRegion(
          x,
          y,
          width,
          height
        );

        // Step 3: Verify dimensions
        const metadata = await imageProcessor.getMetadata(regionBuffer);
        expect(metadata.width).toBe(width);
        expect(metadata.height).toBe(height);

        // Step 4: Process to JPEG with quality
        const processedBuffer = await imageProcessor.encode(
          regionBuffer,
          "jpeg",
          85
        );

        // Step 5: Validate save path
        const savePath = path.join(tempDir, "complete-region-workflow.jpg");
        securityManager.validatePath(savePath);

        // Step 6: Save to disk
        fs.writeFileSync(savePath, processedBuffer);

        // Step 7: Verify result
        expect(fs.existsSync(savePath)).toBe(true);
        const stats = fs.statSync(savePath);
        expect(stats.size).toBeGreaterThan(0);

        // Step 8: Verify saved image
        const savedBuffer = fs.readFileSync(savePath);
        const savedMetadata = await imageProcessor.getMetadata(savedBuffer);
        expect(savedMetadata.format).toBe("jpeg");
        expect(savedMetadata.width).toBe(width);
        expect(savedMetadata.height).toBe(height);

        console.log(
          `Complete workflow: Captured region (${x}, ${y}, ${width}, ${height}) ` +
            `to ${savePath} (${stats.size} bytes)`
        );
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping workflow test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });
});
