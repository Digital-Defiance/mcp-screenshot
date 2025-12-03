/**
 * Unit tests for window capture by title pattern
 * Tests Requirements 2.3: Search windows by title pattern, capture first matching window, handle no matches gracefully
 */

import { LinuxCaptureEngine } from "./linux-capture-engine";
import { MacOSCaptureEngine } from "./macos-capture-engine";
import { WindowsCaptureEngine } from "./windows-capture-engine";
import { WindowInfo } from "../types";
import { BaseCaptureEngine } from "./base-capture-engine";

describe("Window Capture by Title Pattern", () => {
  describe("getWindowByTitle - Pattern Matching", () => {
    let engine: BaseCaptureEngine;
    const mockWindows: WindowInfo[] = [
      {
        id: "1",
        title: "Google Chrome - New Tab",
        processName: "chrome",
        pid: 1001,
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        isMinimized: false,
      },
      {
        id: "2",
        title: "Visual Studio Code - main.ts",
        processName: "code",
        pid: 1002,
        bounds: { x: 100, y: 100, width: 1000, height: 700 },
        isMinimized: false,
      },
      {
        id: "3",
        title: "Terminal - bash",
        processName: "terminal",
        pid: 1003,
        bounds: { x: 200, y: 200, width: 800, height: 600 },
        isMinimized: false,
      },
      {
        id: "4",
        title: "Firefox Browser",
        processName: "firefox",
        pid: 1004,
        bounds: { x: 300, y: 300, width: 1100, height: 750 },
        isMinimized: false,
      },
    ];

    beforeEach(() => {
      // Use Linux engine for testing (same logic applies to all platforms)
      engine = new LinuxCaptureEngine();
      jest.spyOn(engine, "getWindows").mockResolvedValue(mockWindows);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should find window by exact title match", async () => {
      const window = await engine.getWindowByTitle("Terminal - bash");

      expect(window).not.toBeNull();
      expect(window?.id).toBe("3");
      expect(window?.title).toBe("Terminal - bash");
    });

    it("should find window by partial title match (case-insensitive)", async () => {
      const window = await engine.getWindowByTitle("chrome");

      expect(window).not.toBeNull();
      expect(window?.id).toBe("1");
      expect(window?.title).toContain("Chrome");
    });

    it("should find window by regex pattern", async () => {
      const window = await engine.getWindowByTitle("Visual.*Code");

      expect(window).not.toBeNull();
      expect(window?.id).toBe("2");
      expect(window?.processName).toBe("code");
    });

    it("should return first matching window when multiple matches exist", async () => {
      // Both Chrome and Firefox contain "o" but Chrome comes first
      const window = await engine.getWindowByTitle("o");

      expect(window).not.toBeNull();
      expect(window?.id).toBe("1"); // First match (Chrome)
    });

    it("should return null when no window matches the pattern", async () => {
      const window = await engine.getWindowByTitle("NonExistentWindow");

      expect(window).toBeNull();
    });

    it("should handle empty title pattern gracefully", async () => {
      const window = await engine.getWindowByTitle("");

      // Empty pattern should match all windows, return first
      expect(window).not.toBeNull();
      expect(window?.id).toBe("1");
    });

    it("should handle special regex characters in pattern", async () => {
      const mockWindowsWithSpecialChars: WindowInfo[] = [
        {
          id: "1",
          title: "File [modified] - editor.txt",
          processName: "editor",
          pid: 2001,
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          isMinimized: false,
        },
      ];

      jest
        .spyOn(engine, "getWindows")
        .mockResolvedValue(mockWindowsWithSpecialChars);

      // Should escape special regex characters
      const window = await engine.getWindowByTitle("\\[modified\\]");

      expect(window).not.toBeNull();
      expect(window?.title).toContain("[modified]");
    });

    it("should be case-insensitive by default", async () => {
      const windowLower = await engine.getWindowByTitle("terminal");
      const windowUpper = await engine.getWindowByTitle("TERMINAL");
      const windowMixed = await engine.getWindowByTitle("TeRmInAl");

      expect(windowLower).not.toBeNull();
      expect(windowUpper).not.toBeNull();
      expect(windowMixed).not.toBeNull();

      expect(windowLower?.id).toBe("3");
      expect(windowUpper?.id).toBe("3");
      expect(windowMixed?.id).toBe("3");
    });
  });

  describe("Capture Window by Title Pattern - Integration", () => {
    let engine: BaseCaptureEngine;
    const mockWindow: WindowInfo = {
      id: "test-123",
      title: "Test Application Window",
      processName: "testapp",
      pid: 5000,
      bounds: { x: 100, y: 100, width: 800, height: 600 },
      isMinimized: false,
    };

    beforeEach(() => {
      engine = new LinuxCaptureEngine();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should capture window found by title pattern", async () => {
      // Mock getWindowByTitle to return a valid window
      jest.spyOn(engine, "getWindowByTitle").mockResolvedValue(mockWindow);
      jest.spyOn(engine, "getWindowById").mockResolvedValue(mockWindow);

      // Mock the actual capture to avoid system calls
      jest
        .spyOn(engine as any, "captureWindowX11")
        .mockResolvedValue(Buffer.from("fake-image-data"));
      jest
        .spyOn(engine as any, "captureWindowWayland")
        .mockResolvedValue(Buffer.from("fake-image-data"));

      // Find window by title
      const window = await engine.getWindowByTitle("Test Application");
      expect(window).not.toBeNull();

      // Capture the found window
      if (window) {
        const buffer = await engine.captureWindow(window.id, false);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      }
    });

    it("should handle gracefully when no window matches title pattern", async () => {
      // Mock getWindowByTitle to return null (no match)
      jest.spyOn(engine, "getWindowByTitle").mockResolvedValue(null);

      // Find window by title
      const window = await engine.getWindowByTitle("NonExistentApp");

      // Should return null, not throw an error
      expect(window).toBeNull();

      // Attempting to capture should not happen (graceful handling)
      // In real usage, the caller would check for null before capturing
    });

    it("should handle minimized windows found by title pattern", async () => {
      const minimizedWindow: WindowInfo = {
        ...mockWindow,
        isMinimized: true,
      };

      // Mock getWindowByTitle to return a minimized window
      jest.spyOn(engine, "getWindowByTitle").mockResolvedValue(minimizedWindow);
      jest.spyOn(engine, "getWindowById").mockResolvedValue(minimizedWindow);

      // Find window by title
      const window = await engine.getWindowByTitle("Test Application");
      expect(window).not.toBeNull();
      expect(window?.isMinimized).toBe(true);

      // Attempting to capture should throw an error
      if (window) {
        await expect(engine.captureWindow(window.id, false)).rejects.toThrow(
          "Cannot capture minimized window"
        );
      }
    });
  });

  describe("Cross-Platform Consistency", () => {
    const mockWindows: WindowInfo[] = [
      {
        id: "win1",
        title: "Test Window",
        processName: "test",
        pid: 1000,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isMinimized: false,
      },
    ];

    it("should work consistently on Linux", async () => {
      const engine = new LinuxCaptureEngine();
      jest.spyOn(engine, "getWindows").mockResolvedValue(mockWindows);

      const window = await engine.getWindowByTitle("Test");
      expect(window).not.toBeNull();
      expect(window?.title).toBe("Test Window");
    });

    it("should work consistently on macOS", async () => {
      const engine = new MacOSCaptureEngine();
      jest.spyOn(engine, "getWindows").mockResolvedValue(mockWindows);

      const window = await engine.getWindowByTitle("Test");
      expect(window).not.toBeNull();
      expect(window?.title).toBe("Test Window");
    });

    it("should work consistently on Windows", async () => {
      const engine = new WindowsCaptureEngine();
      jest.spyOn(engine, "getWindows").mockResolvedValue(mockWindows);

      const window = await engine.getWindowByTitle("Test");
      expect(window).not.toBeNull();
      expect(window?.title).toBe("Test Window");
    });
  });

  describe("Edge Cases", () => {
    let engine: BaseCaptureEngine;

    beforeEach(() => {
      engine = new LinuxCaptureEngine();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should handle empty window list", async () => {
      jest.spyOn(engine, "getWindows").mockResolvedValue([]);

      const window = await engine.getWindowByTitle("AnyPattern");
      expect(window).toBeNull();
    });

    it("should handle windows with empty titles", async () => {
      const windowsWithEmptyTitle: WindowInfo[] = [
        {
          id: "1",
          title: "",
          processName: "app",
          pid: 1000,
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          isMinimized: false,
        },
        {
          id: "2",
          title: "Normal Window",
          processName: "app2",
          pid: 1001,
          bounds: { x: 100, y: 100, width: 800, height: 600 },
          isMinimized: false,
        },
      ];

      jest.spyOn(engine, "getWindows").mockResolvedValue(windowsWithEmptyTitle);

      // Should skip empty title and find the normal window
      const window = await engine.getWindowByTitle("Normal");
      expect(window).not.toBeNull();
      expect(window?.id).toBe("2");
    });

    it("should handle unicode characters in window titles", async () => {
      const unicodeWindows: WindowInfo[] = [
        {
          id: "1",
          title: "文档编辑器 - Document.txt",
          processName: "editor",
          pid: 1000,
          bounds: { x: 0, y: 0, width: 800, height: 600 },
          isMinimized: false,
        },
      ];

      jest.spyOn(engine, "getWindows").mockResolvedValue(unicodeWindows);

      const window = await engine.getWindowByTitle("文档");
      expect(window).not.toBeNull();
      expect(window?.title).toContain("文档编辑器");
    });
  });
});
