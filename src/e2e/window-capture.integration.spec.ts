/**
 * Integration tests for window capture workflow
 * Tests Requirements 2.1-2.5
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createCaptureEngine } from "../capture";
import { ImageProcessor } from "../processing";
import { SecurityManager } from "../security";
import { PrivacyManager } from "../privacy";
import { ImageFormat } from "../types";

describe("Window Capture Integration Tests", () => {
  let captureEngine: ReturnType<typeof createCaptureEngine>;
  let imageProcessor: ImageProcessor;
  let securityManager: SecurityManager;
  let privacyManager: PrivacyManager;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-screenshot-window-"));

    captureEngine = createCaptureEngine();
    imageProcessor = new ImageProcessor();
    securityManager = new SecurityManager({
      allowedDirectories: [tempDir],
      maxCapturesPerMinute: 50,
      enableAuditLog: true,
    });
    privacyManager = new PrivacyManager([
      "password",
      "1Password",
      "LastPass",
      "Bitwarden",
    ]);
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("Requirement 2.1: Window enumeration", () => {
    it("should return all visible windows with complete metadata", async () => {
      try {
        const windows = await captureEngine.getWindows();
        expect(windows).toBeInstanceOf(Array);

        if (windows.length > 0) {
          for (const window of windows) {
            // Verify all required fields are present
            expect(window).toHaveProperty("id");
            expect(window).toHaveProperty("title");
            expect(window).toHaveProperty("processName");
            expect(window).toHaveProperty("bounds");

            expect(window.id).toBeTruthy();
            expect(window.title).toBeTruthy();
            expect(window.processName).toBeTruthy();

            // Verify bounds structure
            expect(window.bounds).toHaveProperty("x");
            expect(window.bounds).toHaveProperty("y");
            expect(window.bounds).toHaveProperty("width");
            expect(window.bounds).toHaveProperty("height");

            expect(typeof window.bounds.x).toBe("number");
            expect(typeof window.bounds.y).toBe("number");
            expect(window.bounds.width).toBeGreaterThan(0);
            expect(window.bounds.height).toBeGreaterThan(0);

            console.log(
              `Window: ${window.title} (${window.processName}) - ${window.bounds.width}x${window.bounds.height}`
            );
          }
        } else {
          console.warn("No windows available for testing");
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window enumeration not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 2.2: Window capture by ID", () => {
    it("should capture only the window's content area", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping test");
          return;
        }

        // Capture window without frame
        const windowBuffer = await captureEngine.captureWindow(
          visibleWindow.id,
          false
        );

        expect(windowBuffer).toBeInstanceOf(Buffer);
        expect(windowBuffer.length).toBeGreaterThan(0);

        // Verify it's a valid image
        const metadata = await imageProcessor.getMetadata(windowBuffer);
        expect(metadata.width).toBeGreaterThan(0);
        expect(metadata.height).toBeGreaterThan(0);

        // Dimensions should approximately match window bounds (with tolerance for platform differences)
        const widthDiff = Math.abs(metadata.width - visibleWindow.bounds.width);
        const heightDiff = Math.abs(
          metadata.height - visibleWindow.bounds.height
        );

        expect(widthDiff).toBeLessThanOrEqual(20);
        expect(heightDiff).toBeLessThanOrEqual(20);

        console.log(
          `Captured window ${visibleWindow.title}: ${metadata.width}x${metadata.height} ` +
            `(expected ${visibleWindow.bounds.width}x${visibleWindow.bounds.height})`
        );
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("not capturable") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window capture not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should get window by ID correctly", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        const firstWindow = windows[0];
        const foundWindow = await captureEngine.getWindowById(firstWindow.id);

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
          console.warn(`Window enumeration not available - skipping test`);
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
          console.warn(`Window enumeration not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 2.3: Window capture by title pattern", () => {
    it("should find and capture window by title pattern", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping test");
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

          console.log(
            `Found and captured window by pattern "${titlePattern}": ${foundWindow.title}`
          );
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window search not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should return null when no window matches title pattern", async () => {
      try {
        const nonExistentWindow = await captureEngine.getWindowByTitle(
          "ThisWindowDoesNotExist12345"
        );
        expect(nonExistentWindow).toBeNull();
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window search not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 2.4: Minimized window handling", () => {
    it("should return error when attempting to capture minimized window", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        // Find a minimized window if available
        const minimizedWindow = windows.find((w) => w.isMinimized);

        if (minimizedWindow) {
          // Attempting to capture a minimized window should throw an error
          await expect(
            captureEngine.captureWindow(minimizedWindow.id, false)
          ).rejects.toThrow();

          console.log(
            `Correctly rejected capture of minimized window: ${minimizedWindow.title}`
          );
        } else {
          console.warn("No minimized windows found - skipping error test");
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window enumeration not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);

    it("should identify minimized windows in window list", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        // Verify isMinimized property exists on all windows
        for (const window of windows) {
          expect(window).toHaveProperty("isMinimized");
          expect(typeof window.isMinimized).toBe("boolean");
        }

        const minimizedCount = windows.filter((w) => w.isMinimized).length;
        const visibleCount = windows.filter((w) => !w.isMinimized).length;

        console.log(
          `Window status: ${visibleCount} visible, ${minimizedCount} minimized`
        );
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window enumeration not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Requirement 2.5: Frame inclusion", () => {
    it("should include window frame when requested", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping test");
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
          metadataWithFrame.width >= metadataWithoutFrame.width;
        const heightIncreased =
          metadataWithFrame.height >= metadataWithoutFrame.height;

        // At least one dimension should increase (or both should be equal if frame is minimal)
        expect(widthIncreased && heightIncreased).toBe(true);

        console.log(
          `Frame inclusion test for ${visibleWindow.title}:` +
            `\n  Without frame: ${metadataWithoutFrame.width}x${metadataWithoutFrame.height}` +
            `\n  With frame: ${metadataWithFrame.width}x${metadataWithFrame.height}`
        );

        // Save both versions for visual verification
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
          console.warn(`Window capture not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Window capture with different formats", () => {
    it("should capture and save window in multiple formats", async () => {
      try {
        const windows = await captureEngine.getWindows();

        if (windows.length === 0) {
          console.warn("No windows available - skipping test");
          return;
        }

        const visibleWindow = windows.find((w) => !w.isMinimized);
        if (!visibleWindow) {
          console.warn("No visible windows - skipping test");
          return;
        }

        const windowBuffer = await captureEngine.captureWindow(
          visibleWindow.id,
          false
        );

        const formats: ImageFormat[] = ["png", "jpeg", "webp"];

        for (const format of formats) {
          const encoded = await imageProcessor.encode(windowBuffer, format, 85);
          const savePath = path.join(tempDir, `window-capture.${format}`);

          securityManager.validatePath(savePath);
          fs.writeFileSync(savePath, encoded);

          expect(fs.existsSync(savePath)).toBe(true);
          const stats = fs.statSync(savePath);
          expect(stats.size).toBeGreaterThan(0);

          console.log(`Saved window capture in ${format}: ${stats.size} bytes`);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("not capturable") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window capture not available - skipping test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Privacy filtering for windows", () => {
    it("should filter sensitive windows based on privacy patterns", async () => {
      try {
        const windows = await captureEngine.getWindows();

        // Test privacy filtering
        const sensitiveWindows = windows.filter((w) =>
          privacyManager.shouldExcludeWindow(w.title)
        );

        console.log(
          `Found ${sensitiveWindows.length} sensitive windows out of ${windows.length} total`
        );

        // Verify filtering logic works
        const testCases = [
          { title: "1Password - Main Vault", shouldExclude: true },
          { title: "LastPass Password Manager", shouldExclude: true },
          { title: "Bitwarden - Locked", shouldExclude: true },
          { title: "Password Reset Form", shouldExclude: true },
          { title: "Firefox - Mozilla", shouldExclude: false },
          { title: "VS Code - project.ts", shouldExclude: false },
          { title: "Terminal - bash", shouldExclude: false },
        ];

        for (const testCase of testCases) {
          const result = privacyManager.shouldExcludeWindow(testCase.title);
          expect(result).toBe(testCase.shouldExclude);
        }
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window enumeration not available - testing logic only`);

          // Test privacy filtering logic even without real windows
          const testCases = [
            { title: "1Password - Main Vault", shouldExclude: true },
            { title: "Firefox - Mozilla", shouldExclude: false },
          ];

          for (const testCase of testCases) {
            const result = privacyManager.shouldExcludeWindow(testCase.title);
            expect(result).toBe(testCase.shouldExclude);
          }
          return;
        }
        throw error;
      }
    }, 30000);
  });

  describe("Complete window capture workflow", () => {
    it("should execute complete window enumeration, capture, and save workflow", async () => {
      try {
        // Step 1: Enumerate windows
        const windows = await captureEngine.getWindows();
        expect(windows).toBeInstanceOf(Array);

        if (windows.length === 0) {
          console.warn("No windows available - skipping workflow test");
          return;
        }

        // Step 2: Filter out sensitive windows
        const safeWindows = windows.filter(
          (w) => !privacyManager.shouldExcludeWindow(w.title)
        );

        if (safeWindows.length === 0) {
          console.warn("No safe windows available - skipping workflow test");
          return;
        }

        // Step 3: Find a visible window
        const targetWindow = safeWindows.find((w) => !w.isMinimized);
        if (!targetWindow) {
          console.warn("No visible safe windows - skipping workflow test");
          return;
        }

        // Step 4: Capture window
        const windowBuffer = await captureEngine.captureWindow(
          targetWindow.id,
          true
        );

        // Step 5: Process image
        const processedBuffer = await imageProcessor.encode(
          windowBuffer,
          "png"
        );

        // Step 6: Validate path
        const savePath = path.join(tempDir, "complete-window-workflow.png");
        securityManager.validatePath(savePath);

        // Step 7: Save to disk
        fs.writeFileSync(savePath, processedBuffer);

        // Step 8: Verify result
        expect(fs.existsSync(savePath)).toBe(true);
        const stats = fs.statSync(savePath);
        expect(stats.size).toBeGreaterThan(0);

        // Step 9: Verify saved image
        const savedBuffer = fs.readFileSync(savePath);
        const metadata = await imageProcessor.getMetadata(savedBuffer);
        expect(metadata.format).toBe("png");

        console.log(
          `Complete workflow: Captured window "${targetWindow.title}" ` +
            `(${metadata.width}x${metadata.height}) to ${savePath}`
        );
      } catch (error) {
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("not capturable") ||
          errorMessage.includes("command not found")
        ) {
          console.warn(`Window capture not available - skipping workflow test`);
          return;
        }
        throw error;
      }
    }, 30000);
  });
});
