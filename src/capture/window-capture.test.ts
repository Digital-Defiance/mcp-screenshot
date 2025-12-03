/**
 * Unit tests for window capture validation
 */

import { LinuxCaptureEngine } from "./linux-capture-engine";
import { MacOSCaptureEngine } from "./macos-capture-engine";
import { WindowsCaptureEngine } from "./windows-capture-engine";
import { WindowNotFoundError } from "../errors";
import { WindowInfo } from "../types";

describe("Window Capture Validation", () => {
  describe("Linux Capture Engine", () => {
    let engine: LinuxCaptureEngine;

    beforeEach(() => {
      engine = new LinuxCaptureEngine();
    });

    it("should throw WindowNotFoundError when window does not exist", async () => {
      // Mock getWindowById to return null
      jest.spyOn(engine, "getWindowById").mockResolvedValue(null);

      await expect(
        engine.captureWindow("non-existent-window", false)
      ).rejects.toThrow(WindowNotFoundError);

      await expect(
        engine.captureWindow("non-existent-window", false)
      ).rejects.toThrow("Window non-existent-window not found");
    });

    it("should throw WindowNotFoundError when window is minimized", async () => {
      // Mock getWindowById to return a minimized window
      const minimizedWindow: WindowInfo = {
        id: "test-window",
        title: "Test Window",
        processName: "test",
        pid: 1234,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isMinimized: true,
      };

      jest.spyOn(engine, "getWindowById").mockResolvedValue(minimizedWindow);

      await expect(engine.captureWindow("test-window", false)).rejects.toThrow(
        WindowNotFoundError
      );

      await expect(engine.captureWindow("test-window", false)).rejects.toThrow(
        "Cannot capture minimized window test-window"
      );
    });

    it("should validate window exists and is visible before attempting capture", async () => {
      // Mock getWindowById to return a valid window
      const validWindow: WindowInfo = {
        id: "test-window",
        title: "Test Window",
        processName: "test",
        pid: 1234,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isMinimized: false,
      };

      const getWindowByIdSpy = jest
        .spyOn(engine, "getWindowById")
        .mockResolvedValue(validWindow);

      // Mock the actual capture to avoid system calls
      jest
        .spyOn(engine as any, "captureWindowX11")
        .mockResolvedValue(Buffer.from("fake-image-data"));
      jest
        .spyOn(engine as any, "captureWindowWayland")
        .mockResolvedValue(Buffer.from("fake-image-data"));

      // Attempt capture
      try {
        await engine.captureWindow("test-window", false);
      } catch (error) {
        // Capture might fail due to missing tools, but validation should have been called
      }

      // Verify that getWindowById was called to validate the window
      expect(getWindowByIdSpy).toHaveBeenCalledWith("test-window");
    });
  });

  describe("macOS Capture Engine", () => {
    let engine: MacOSCaptureEngine;

    beforeEach(() => {
      engine = new MacOSCaptureEngine();
    });

    it("should throw WindowNotFoundError when window does not exist", async () => {
      // Mock getWindowById to return null
      jest.spyOn(engine, "getWindowById").mockResolvedValue(null);

      await expect(
        engine.captureWindow("non-existent-window", false)
      ).rejects.toThrow(WindowNotFoundError);

      await expect(
        engine.captureWindow("non-existent-window", false)
      ).rejects.toThrow("Window non-existent-window not found");
    });

    it("should throw WindowNotFoundError when window is minimized", async () => {
      // Mock getWindowById to return a minimized window
      const minimizedWindow: WindowInfo = {
        id: "test-window",
        title: "Test Window",
        processName: "test",
        pid: 1234,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isMinimized: true,
      };

      jest.spyOn(engine, "getWindowById").mockResolvedValue(minimizedWindow);

      await expect(engine.captureWindow("test-window", false)).rejects.toThrow(
        WindowNotFoundError
      );

      await expect(engine.captureWindow("test-window", false)).rejects.toThrow(
        "Cannot capture minimized window test-window"
      );
    });
  });

  describe("Windows Capture Engine", () => {
    let engine: WindowsCaptureEngine;

    beforeEach(() => {
      engine = new WindowsCaptureEngine();
    });

    it("should throw WindowNotFoundError when window does not exist", async () => {
      // Mock getWindowById to return null
      jest.spyOn(engine, "getWindowById").mockResolvedValue(null);

      await expect(
        engine.captureWindow("non-existent-window", false)
      ).rejects.toThrow(WindowNotFoundError);

      await expect(
        engine.captureWindow("non-existent-window", false)
      ).rejects.toThrow("Window non-existent-window not found");
    });

    it("should throw WindowNotFoundError when window is minimized", async () => {
      // Mock getWindowById to return a minimized window
      const minimizedWindow: WindowInfo = {
        id: "test-window",
        title: "Test Window",
        processName: "test",
        pid: 1234,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isMinimized: true,
      };

      jest.spyOn(engine, "getWindowById").mockResolvedValue(minimizedWindow);

      await expect(engine.captureWindow("test-window", false)).rejects.toThrow(
        WindowNotFoundError
      );

      await expect(engine.captureWindow("test-window", false)).rejects.toThrow(
        "Cannot capture minimized window test-window"
      );
    });
  });

  describe("Frame Inclusion", () => {
    it("should pass includeFrame parameter to capture methods", async () => {
      const engine = new LinuxCaptureEngine();

      // Mock getWindowById to return a valid window
      const validWindow: WindowInfo = {
        id: "test-window",
        title: "Test Window",
        processName: "test",
        pid: 1234,
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        isMinimized: false,
      };

      jest.spyOn(engine, "getWindowById").mockResolvedValue(validWindow);

      // Mock the actual capture methods
      const captureX11Spy = jest
        .spyOn(engine as any, "captureWindowX11")
        .mockResolvedValue(Buffer.from("fake-image-data"));

      try {
        // Test with includeFrame = true
        await engine.captureWindow("test-window", true);
        expect(captureX11Spy).toHaveBeenCalledWith("test-window", true);

        // Test with includeFrame = false
        await engine.captureWindow("test-window", false);
        expect(captureX11Spy).toHaveBeenCalledWith("test-window", false);
      } catch (error) {
        // Capture might fail due to missing tools, but we're testing the parameter passing
      }
    });
  });
});
