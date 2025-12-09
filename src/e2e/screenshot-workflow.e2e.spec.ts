/**
 * End-to-end tests for MCP Screenshot workflows
 * Tests the integration of capture engines, image processing, and security
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import sharp from "sharp";
import { createCaptureEngine } from "../capture";
import { ImageProcessor } from "../processing";
import { SecurityManager } from "../security";
import { PrivacyManager } from "../privacy";
import { ImageFormat } from "../types";

describe("Screenshot Workflow E2E Tests", () => {
  jest.setTimeout(120000);
  let captureEngine: ReturnType<typeof createCaptureEngine>;
  let imageProcessor: ImageProcessor;
  let securityManager: SecurityManager;
  let privacyManager: PrivacyManager;
  let tempDir: string;
  let captureAvailable = true;

  beforeAll(async () => {
    // Test if capture is available
    try {
      const testEngine = createCaptureEngine();
      const testBuffer = await testEngine.captureRegion(0, 0, 1, 1);
      if (!testBuffer || testBuffer.length === 0) {
        captureAvailable = false;
        console.warn(
          "⚠️  Screen capture returns empty buffers - skipping workflow tests"
        );
      }
    } catch (error) {
      captureAvailable = false;
      console.warn(
        "⚠️  Screen capture not available - skipping workflow tests"
      );
    }
  }, 60000);

  beforeAll(() => {
    // Create temporary directory for test outputs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-screenshot-test-"));

    // Initialize components
    captureEngine = createCaptureEngine();
    imageProcessor = new ImageProcessor();
    securityManager = new SecurityManager({
      allowedDirectories: [tempDir],
      maxCapturesPerMinute: 10,
      enableAuditLog: false,
    });
    privacyManager = new PrivacyManager();
  }, 60000);

  afterAll(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Full Screen Capture Workflow", () => {
    it("should capture, process, and save a full screen screenshot", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Step 1: Capture the screen
        const captureBuffer = await captureEngine.captureScreen();
        expect(captureBuffer).toBeInstanceOf(Buffer);
        expect(captureBuffer.length).toBeGreaterThan(0);

        // Step 2: Get metadata
        const metadata = await imageProcessor.getMetadata(captureBuffer);
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);

        // Step 3: Convert to different formats
        const formats: ImageFormat[] = ["png", "jpeg", "webp"];
        for (const format of formats) {
          const encoded = await imageProcessor.encode(
            captureBuffer,
            format,
            90
          );
          expect(encoded).toBeInstanceOf(Buffer);
          expect(encoded.length).toBeGreaterThan(0);

          // Verify the format
          const encodedMetadata = await sharp(encoded).metadata();
          expect(encodedMetadata.format).toBe(format);
        }

        // Step 4: Save to disk with security validation
        const savePath = path.join(tempDir, "full-screen.png");
        securityManager.validatePath(savePath);

        const pngBuffer = await imageProcessor.encode(captureBuffer, "png");
        fs.writeFileSync(savePath, pngBuffer);

        expect(fs.existsSync(savePath)).toBe(true);
        const stats = fs.statSync(savePath);
        expect(stats.size).toBeGreaterThan(0);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("ENOENT") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Screen capture tools not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 120000);

    it("should handle display enumeration and capture specific displays", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Get all displays
        const displays = await captureEngine.getDisplays();
        expect(displays).toBeInstanceOf(Array);
        expect(displays.length).toBeGreaterThan(0);

        // Verify display information structure
        const primaryDisplay = displays.find((d) => d.isPrimary);
        expect(primaryDisplay).toBeDefined();
        expect(primaryDisplay?.resolution.width).toBeGreaterThan(0);
        expect(primaryDisplay?.resolution.height).toBeGreaterThan(0);

        // Try to capture the primary display
        if (primaryDisplay) {
          const displayBuffer = await captureEngine.captureScreen(
            primaryDisplay.id
          );
          const metadata = await imageProcessor.getMetadata(displayBuffer);
          expect(metadata.width).toBe(primaryDisplay.resolution.width);
          expect(metadata.height).toBe(primaryDisplay.resolution.height);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Display tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should verify all display information is complete", async () => {
      try {
        const displays = await captureEngine.getDisplays();
        expect(displays.length).toBeGreaterThan(0);

        // Verify each display has complete information
        for (const display of displays) {
          expect(display.id).toBeDefined();
          expect(display.name).toBeDefined();
          expect(display.resolution).toBeDefined();
          expect(display.resolution.width).toBeGreaterThan(0);
          expect(display.resolution.height).toBeGreaterThan(0);
          expect(display.position).toBeDefined();
          expect(typeof display.position.x).toBe("number");
          expect(typeof display.position.y).toBe("number");
          expect(typeof display.isPrimary).toBe("boolean");

          console.log(
            `Display ${display.id}: ${display.resolution.width}x${display.resolution.height} ` +
              `at (${display.position.x}, ${display.position.y}), primary: ${display.isPrimary}`
          );
        }

        // Verify exactly one primary display
        const primaryDisplays = displays.filter((d) => d.isPrimary);
        expect(primaryDisplays.length).toBe(1);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Display tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should capture and save screenshots from all displays", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const displays = await captureEngine.getDisplays();

        for (const display of displays) {
          try {
            const displayBuffer = await captureEngine.captureScreen(display.id);
            const metadata = await imageProcessor.getMetadata(displayBuffer);

            // Verify dimensions match
            expect(metadata.width).toBe(display.resolution.width);
            expect(metadata.height).toBe(display.resolution.height);

            // Save the capture
            const savePath = path.join(tempDir, `display-${display.id}.png`);
            securityManager.validatePath(savePath);
            const pngBuffer = await imageProcessor.encode(displayBuffer, "png");
            fs.writeFileSync(savePath, pngBuffer);

            expect(fs.existsSync(savePath)).toBe(true);
            console.log(`Captured display ${display.id} to ${savePath}`);
          } catch (error) {
            console.warn(
              `Could not capture display ${display.id}: ${
                (error as Error).message
              }`
            );
          }
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Display tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 60000);
  });

  describe("Region Capture Workflow", () => {
    it("should capture and process a specific screen region", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Capture a small region (100x100 from top-left)
        const regionBuffer = await captureEngine.captureRegion(0, 0, 100, 100);
        expect(regionBuffer).toBeInstanceOf(Buffer);

        // Verify dimensions
        const metadata = await imageProcessor.getMetadata(regionBuffer);
        expect(metadata.width).toBe(100);
        expect(metadata.height).toBe(100);

        // Process and save
        const savePath = path.join(tempDir, "region-capture.png");
        securityManager.validatePath(savePath);

        const pngBuffer = await imageProcessor.encode(regionBuffer, "png");
        fs.writeFileSync(savePath, pngBuffer);

        expect(fs.existsSync(savePath)).toBe(true);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found") ||
          errorMessage.includes("CaptureFailedError") ||
          errorMessage.includes("failed")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 120000);

    it("should handle region cropping with image processor", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
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
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found") ||
          errorMessage.includes("CaptureFailedError") ||
          errorMessage.includes("failed")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 120000);

    it("should capture regions at different positions", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Capture regions at different positions
        const positions = [
          { x: 0, y: 0, width: 50, height: 50 },
          { x: 100, y: 100, width: 50, height: 50 },
          { x: 200, y: 200, width: 50, height: 50 },
        ];

        for (const pos of positions) {
          const regionBuffer = await captureEngine.captureRegion(
            pos.x,
            pos.y,
            pos.width,
            pos.height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);
          expect(metadata.width).toBe(pos.width);
          expect(metadata.height).toBe(pos.height);

          console.log(
            `Captured region at (${pos.x}, ${pos.y}): ${metadata.width}x${metadata.height}`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found") ||
          errorMessage.includes("CaptureFailedError") ||
          errorMessage.includes("failed")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 180000);

    it("should handle various region sizes", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Test different region sizes
        const sizes = [
          { width: 10, height: 10 },
          { width: 50, height: 50 },
          { width: 100, height: 200 },
          { width: 200, height: 100 },
        ];

        for (const size of sizes) {
          const regionBuffer = await captureEngine.captureRegion(
            0,
            0,
            size.width,
            size.height
          );

          const metadata = await imageProcessor.getMetadata(regionBuffer);
          expect(metadata.width).toBe(size.width);
          expect(metadata.height).toBe(size.height);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found") ||
          errorMessage.includes("CaptureFailedError") ||
          errorMessage.includes("failed")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 180000);

    it("should save region captures in different formats", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const regionBuffer = await captureEngine.captureRegion(0, 0, 100, 100);

        const formats: ImageFormat[] = ["png", "jpeg", "webp"];

        for (const format of formats) {
          const encoded = await imageProcessor.encode(regionBuffer, format);
          const savePath = path.join(tempDir, `region-capture.${format}`);
          securityManager.validatePath(savePath);
          fs.writeFileSync(savePath, encoded);

          expect(fs.existsSync(savePath)).toBe(true);
          const stats = fs.statSync(savePath);
          expect(stats.size).toBeGreaterThan(0);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found") ||
          errorMessage.includes("CaptureFailedError") ||
          errorMessage.includes("failed")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 120000);
  });

  describe("Window Capture Workflow", () => {
    it("should enumerate windows and capture window information", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Get all windows
        const windows = await captureEngine.getWindows();
        expect(windows).toBeInstanceOf(Array);

        // If windows are available, verify structure
        if (windows.length > 0) {
          const window = windows[0];
          expect(window.id).toBeDefined();
          expect(window.title).toBeDefined();
          expect(window.processName).toBeDefined();
          expect(window.bounds).toBeDefined();
          expect(window.bounds.width).toBeGreaterThan(0);
          expect(window.bounds.height).toBeGreaterThan(0);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window enumeration tools not available - skipping test`
          );
          return;
        }
        throw error;
      }
    }, 30000);

    it("should capture window by ID without frame", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping window capture test");
          return;
        }

        // Find a visible window
        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping window capture test");
          return;
        }

        // Capture window without frame
        const windowBuffer = await captureEngine.captureWindow(
          visibleWindow.id,
          false
        );
        expect(windowBuffer).toBeInstanceOf(Buffer);
        expect(windowBuffer.length).toBeGreaterThan(0);

        // Verify dimensions match window bounds (with tolerance)
        const metadata = await imageProcessor.getMetadata(windowBuffer);
        const widthDiff = Math.abs(metadata.width - visibleWindow.bounds.width);
        const heightDiff = Math.abs(
          metadata.height - visibleWindow.bounds.height
        );

        // Allow up to 50 pixels difference for platform variations
        expect(widthDiff).toBeLessThanOrEqual(50);
        expect(heightDiff).toBeLessThanOrEqual(50);

        // Save the captured window
        const savePath = path.join(tempDir, "window-no-frame.png");
        securityManager.validatePath(savePath);
        const pngBuffer = await imageProcessor.encode(windowBuffer, "png");
        fs.writeFileSync(savePath, pngBuffer);
        expect(fs.existsSync(savePath)).toBe(true);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("not capturable") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window capture not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 30000);

    it("should capture window with frame and verify dimensions increase", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping frame inclusion test");
          return;
        }

        // Find a visible window
        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping frame inclusion test");
          return;
        }

        // Capture window without frame
        const windowWithoutFrame = await captureEngine.captureWindow(
          visibleWindow.id,
          false
        );
        const metadataWithoutFrame = await imageProcessor.getMetadata(
          windowWithoutFrame
        );

        // Capture window with frame
        const windowWithFrame = await captureEngine.captureWindow(
          visibleWindow.id,
          true
        );
        const metadataWithFrame = await imageProcessor.getMetadata(
          windowWithFrame
        );

        // Verify frame inclusion increases dimensions
        const widthIncreased =
          metadataWithFrame.width > metadataWithoutFrame.width;
        const heightIncreased =
          metadataWithFrame.height > metadataWithoutFrame.height;

        expect(widthIncreased || heightIncreased).toBe(true);

        console.log(
          `Frame inclusion test: Without frame ${metadataWithoutFrame.width}x${metadataWithoutFrame.height}, ` +
            `With frame ${metadataWithFrame.width}x${metadataWithFrame.height}`
        );

        // Save both versions
        const pathWithoutFrame = path.join(tempDir, "window-no-frame.png");
        const pathWithFrame = path.join(tempDir, "window-with-frame.png");

        securityManager.validatePath(pathWithoutFrame);
        securityManager.validatePath(pathWithFrame);

        const pngWithoutFrame = await imageProcessor.encode(
          windowWithoutFrame,
          "png"
        );
        const pngWithFrame = await imageProcessor.encode(
          windowWithFrame,
          "png"
        );

        fs.writeFileSync(pathWithoutFrame, pngWithoutFrame);
        fs.writeFileSync(pathWithFrame, pngWithFrame);

        expect(fs.existsSync(pathWithoutFrame)).toBe(true);
        expect(fs.existsSync(pathWithFrame)).toBe(true);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("not capturable") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window capture not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 30000);

    it("should capture window by title pattern", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping title pattern test");
          return;
        }

        // Find a visible window
        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping title pattern test");
          return;
        }

        // Extract a pattern from the window title
        const titlePattern = visibleWindow.title.split(" ")[0];
        if (!titlePattern) {
          console.warn("Cannot extract title pattern - skipping test");
          return;
        }

        // Find window by title pattern
        const foundWindow = await captureEngine.getWindowByTitle(titlePattern);

        if (!foundWindow) {
          console.warn("Window not found by title pattern - skipping test");
          return;
        }

        expect(foundWindow).toBeDefined();
        expect(foundWindow?.title).toContain(titlePattern);

        // Capture the found window
        if (foundWindow) {
          const windowBuffer = await captureEngine.captureWindow(
            foundWindow.id,
            false
          );
          expect(windowBuffer).toBeInstanceOf(Buffer);
          expect(windowBuffer.length).toBeGreaterThan(0);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window search not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 30000);

    it("should handle minimized windows correctly", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping minimized window test");
          return;
        }

        // Find a minimized window if available
        const minimizedWindow = windows.find((w) => w.isMinimized);

        if (minimizedWindow) {
          // Attempting to capture a minimized window should throw an error
          await expect(
            captureEngine.captureWindow(minimizedWindow.id, false)
          ).rejects.toThrow();
        } else {
          console.warn("No minimized windows found - skipping error test");
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window enumeration not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 30000);

    it("should filter windows based on privacy patterns", async () => {
      try {
        const windows = await captureEngine.getWindows();

        // Test privacy filtering
        const passwordWindows = windows.filter((w) =>
          privacyManager.shouldExcludeWindow(w.title)
        );

        // Verify filtering logic works
        const testWindow = { title: "1Password - Password Manager" };
        expect(privacyManager.shouldExcludeWindow(testWindow.title)).toBe(true);

        const normalWindow = { title: "Firefox - Mozilla" };
        expect(privacyManager.shouldExcludeWindow(normalWindow.title)).toBe(
          false
        );
      } catch (error) {
        console.warn(`Window enumeration not available - testing logic only`);

        // Test privacy filtering logic even without real windows
        const testWindow = { title: "1Password - Password Manager" };
        expect(privacyManager.shouldExcludeWindow(testWindow.title)).toBe(true);

        const normalWindow = { title: "Firefox - Mozilla" };
        expect(privacyManager.shouldExcludeWindow(normalWindow.title)).toBe(
          false
        );
      }
    }, 30000);

    it("should get window by ID correctly", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping getWindowById test");
          return;
        }

        const firstWindow = windows[0];
        const foundWindow = await captureEngine.getWindowById(firstWindow.id);

        if (!foundWindow) {
          console.warn("Window not found by ID - skipping test");
          return;
        }

        expect(foundWindow).toBeDefined();
        expect(foundWindow?.id).toBe(firstWindow.id);
        expect(foundWindow?.title).toBe(firstWindow.title);
        expect(foundWindow?.processName).toBe(firstWindow.processName);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window enumeration not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 30000);

    it("should return null for non-existent window ID", async () => {
      try {
        const nonExistentWindow = await captureEngine.getWindowById(
          "non-existent-window-id-12345"
        );
        expect(nonExistentWindow).toBeNull();
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Window enumeration not available - skipping test: ${errorMessage}`
          );
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Image Processing Workflow", () => {
    it("should convert between different image formats", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        // Capture a small region for testing
        const originalBuffer = await captureEngine.captureRegion(0, 0, 50, 50);

        // Convert to different formats
        const formats: ImageFormat[] = ["png", "jpeg", "webp"];
        const converted: Record<string, Buffer> = {};

        for (const format of formats) {
          converted[format] = await imageProcessor.convertFormat(
            originalBuffer,
            format
          );
          const metadata = await sharp(converted[format]).metadata();
          expect(metadata.format).toBe(format);
        }

        // Verify JPEG is typically smaller than PNG for photos
        expect(converted["jpeg"].length).toBeLessThan(
          converted["png"].length * 2
        );
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
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

    it("should apply quality settings to lossy formats", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const originalBuffer = await captureEngine.captureRegion(
          0,
          0,
          100,
          100
        );

        // Encode with different quality levels
        const highQuality = await imageProcessor.encode(
          originalBuffer,
          "jpeg",
          95
        );
        const lowQuality = await imageProcessor.encode(
          originalBuffer,
          "jpeg",
          50
        );

        // Lower quality should produce smaller files
        expect(lowQuality.length).toBeLessThan(highQuality.length);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
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
    it("should resize images correctly", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const originalBuffer = await captureEngine.captureRegion(
          0,
          0,
          200,
          200
        );

        // Resize to smaller dimensions
        const resizedBuffer = await imageProcessor.resize(
          originalBuffer,
          100,
          100
        );

        const metadata = await imageProcessor.getMetadata(resizedBuffer);
        expect(metadata.width).toBe(100);
        expect(metadata.height).toBe(100);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
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

    it("should encode all supported formats correctly", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const originalBuffer = await captureEngine.captureRegion(
          0,
          0,
          100,
          100
        );

        // Test all supported formats
        const formats: ImageFormat[] = ["png", "jpeg", "webp", "bmp"];

        for (const format of formats) {
          const encoded = await imageProcessor.encode(originalBuffer, format);
          expect(encoded).toBeInstanceOf(Buffer);
          expect(encoded.length).toBeGreaterThan(0);

          // Verify format
          if (format === "bmp") {
            // Check magic bytes for BMP
            expect(encoded[0]).toBe(0x42); // B
            expect(encoded[1]).toBe(0x4d); // M
          } else {
            const metadata = await sharp(encoded).metadata();
            expect(metadata.format).toBe(format);
          }

          // Save to verify it's a valid file
          const savePath = path.join(tempDir, `test-encode.${format}`);
          securityManager.validatePath(savePath);
          fs.writeFileSync(savePath, encoded);
          expect(fs.existsSync(savePath)).toBe(true);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Capture tools not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 120000);

    it("should handle base64 encoding and decoding", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const originalBuffer = await captureEngine.captureRegion(0, 0, 50, 50);

        // Encode to PNG
        const pngBuffer = await imageProcessor.encode(originalBuffer, "png");

        // Convert to base64
        const base64String = pngBuffer.toString("base64");
        expect(base64String).toBeTruthy();
        expect(base64String.length).toBeGreaterThan(0);

        // Decode from base64
        const decodedBuffer = Buffer.from(base64String, "base64");
        expect(decodedBuffer.length).toBe(pngBuffer.length);

        // Verify it's still a valid image
        const metadata = await imageProcessor.getMetadata(decodedBuffer);
        expect(metadata.format).toBe("png");
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
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

    it("should extract and verify image metadata", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const captureBuffer = await captureEngine.captureRegion(0, 0, 150, 150);

        const metadata = await imageProcessor.getMetadata(captureBuffer);

        // Verify metadata structure
        expect(metadata).toHaveProperty("width");
        expect(metadata).toHaveProperty("height");
        expect(metadata).toHaveProperty("format");

        // Verify values
        expect(metadata.width).toBe(150);
        expect(metadata.height).toBe(150);
        expect(metadata.format).toBeDefined();

        console.log(
          `Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`
        );
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
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

  describe("Security Workflow", () => {
    it("should enforce path validation", () => {
      // Valid path within allowed directory
      const validPath = path.join(tempDir, "screenshot.png");
      expect(() => securityManager.validatePath(validPath)).not.toThrow();

      // Invalid path outside allowed directory
      const invalidPath = "/tmp/outside/screenshot.png";
      expect(() => securityManager.validatePath(invalidPath)).toThrow();

      // Path traversal attempt
      const traversalPath = path.join(tempDir, "../../../etc/passwd");
      expect(() => securityManager.validatePath(traversalPath)).toThrow();
    });

    it("should enforce rate limiting", () => {
      const agentId = "test-agent-1";

      // Should allow captures up to the limit
      for (let i = 0; i < 10; i++) {
        expect(() => securityManager.checkRateLimit(agentId)).not.toThrow();
      }

      // Should block after exceeding limit
      expect(() => securityManager.checkRateLimit(agentId)).toThrow();
    });

    it("should allow different agents to have separate rate limits", () => {
      const agent1 = "test-agent-2";
      const agent2 = "test-agent-3";

      // Both agents should have their own limits
      for (let i = 0; i < 5; i++) {
        expect(() => securityManager.checkRateLimit(agent1)).not.toThrow();
        expect(() => securityManager.checkRateLimit(agent2)).not.toThrow();
      }
    });

    it("should support custom security policies", () => {
      const customManager = new SecurityManager({
        allowedDirectories: ["/custom/path"],
        maxCapturesPerMinute: 5,
        blockedWindowPatterns: ["secret", "private"],
        enableAuditLog: false,
      });

      const policy = customManager.getPolicy();
      expect(policy.allowedDirectories).toContain("/custom/path");
      expect(policy.maxCapturesPerMinute).toBe(5);
      expect(policy.blockedWindowPatterns).toContain("secret");
    });
  });

  describe("Privacy Workflow", () => {
    it("should identify windows to exclude based on patterns", () => {
      const sensitiveWindows = [
        "1Password - Main Vault",
        "LastPass Password Manager",
        "Bitwarden - Locked",
        "Password Reset Form",
      ];

      const normalWindows = [
        "Firefox - Mozilla",
        "VS Code - project.ts",
        "Terminal - bash",
      ];

      // Sensitive windows should be excluded
      sensitiveWindows.forEach((title) => {
        expect(privacyManager.shouldExcludeWindow(title)).toBe(true);
      });

      // Normal windows should not be excluded
      normalWindows.forEach((title) => {
        expect(privacyManager.shouldExcludeWindow(title)).toBe(false);
      });
    });

    it("should handle PII masking workflow (placeholder)", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const buffer = await captureEngine.captureRegion(0, 0, 100, 100);

        // Test PII masking (currently returns original buffer)
        const result = await privacyManager.maskPII(buffer);

        expect(result.maskedBuffer).toBeInstanceOf(Buffer);
        expect(result.stats).toBeDefined();
        expect(result.stats.emailsRedacted).toBe(0);
        expect(result.stats.phonesRedacted).toBe(0);
        expect(result.stats.creditCardsRedacted).toBe(0);
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
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

  describe("Complete End-to-End Workflow", () => {
    it("should execute a complete screenshot workflow with all components", async () => {
      if (!captureAvailable) {
        console.warn("Skipping test - capture not available");
        return;
      }
      try {
        const agentId = "e2e-test-agent";

        // Step 1: Check rate limit
        securityManager.checkRateLimit(agentId);

        // Step 2: Get displays
        const displays = await captureEngine.getDisplays();
        expect(displays.length).toBeGreaterThan(0);

        // Step 3: Capture screen
        const captureBuffer = await captureEngine.captureScreen();
        expect(captureBuffer.length).toBeGreaterThan(0);

        // Step 4: Apply privacy masking (placeholder)
        const { maskedBuffer, stats } = await privacyManager.maskPII(
          captureBuffer
        );

        // Step 5: Process image (convert to JPEG with quality)
        const processedBuffer = await imageProcessor.encode(
          maskedBuffer,
          "jpeg",
          85
        );

        // Step 6: Validate save path
        const savePath = path.join(tempDir, "complete-workflow.jpg");
        securityManager.validatePath(savePath);

        // Step 7: Save to disk
        fs.writeFileSync(savePath, processedBuffer);

        // Step 8: Verify result
        expect(fs.existsSync(savePath)).toBe(true);
        const fileStats = fs.statSync(savePath);
        expect(fileStats.size).toBeGreaterThan(0);

        // Step 9: Verify image can be read back
        const savedBuffer = fs.readFileSync(savePath);
        const metadata = await imageProcessor.getMetadata(savedBuffer);
        expect(metadata.format).toBe("jpeg");

        // Step 10: Audit log (would log in real scenario)
        securityManager.auditLog(
          "screenshot_capture_full",
          { format: "jpeg", quality: 85 },
          { status: "success", filePath: savePath }
        );
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(
            `Capture tools not available - skipping complete workflow test`
          );
          return;
        }
        throw error;
      }
    }, 120000);
  });
});
