import { WSLCaptureEngine } from "./wsl-capture-engine";
import { exec } from "child_process";
import { CaptureFailedError, WindowNotFoundError } from "../errors";

// Mock child_process
jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("WSLCaptureEngine", () => {
  let engine: WSLCaptureEngine;
  let mockExec: jest.Mock;

  beforeEach(() => {
    engine = new WSLCaptureEngine();
    mockExec = exec as unknown as jest.Mock;
    jest.clearAllMocks();
  });

  // Helper to mock exec success
  const mockExecSuccess = (stdout: string, stderr = "") => {
    mockExec.mockImplementation((cmd, options, callback) => {
      callback(null, { stdout, stderr });
    });
  };

  // Helper to mock exec failure
  const mockExecError = (error: Error) => {
    mockExec.mockImplementation((cmd, options, callback) => {
      callback(error, { stdout: "", stderr: error.message });
    });
  };

  describe("captureScreen", () => {
    it("should capture full screen successfully", async () => {
      const mockBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      mockExecSuccess(mockBase64);

      const buffer = await engine.captureScreen();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString("base64")).toBe(mockBase64);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("powershell.exe"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should capture specific display successfully", async () => {
      const mockBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      mockExecSuccess(mockBase64);

      const buffer = await engine.captureScreen("Display1");
      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("Display1"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should throw CaptureFailedError on failure", async () => {
      mockExecError(new Error("PowerShell failed"));

      await expect(engine.captureScreen()).rejects.toThrow(CaptureFailedError);
    });

    it("should throw error on empty output", async () => {
      mockExecSuccess("");

      await expect(engine.captureScreen()).rejects.toThrow(CaptureFailedError);
    });
  });

  describe("captureWindow", () => {
    it("should capture window successfully", async () => {
      const mockBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      mockExecSuccess(mockBase64);

      const buffer = await engine.captureWindow("12345", false);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("12345"),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should throw WindowNotFoundError for minimized window", async () => {
      mockExecError(new Error("Window is minimized"));

      await expect(engine.captureWindow("12345", false)).rejects.toThrow(
        WindowNotFoundError
      );
    });

    it("should throw CaptureFailedError for other errors", async () => {
      mockExecError(new Error("Generic error"));

      await expect(engine.captureWindow("12345", false)).rejects.toThrow(
        CaptureFailedError
      );
    });
  });

  describe("captureRegion", () => {
    it("should capture region successfully", async () => {
      const mockBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      mockExecSuccess(mockBase64);

      // Mock getDisplays for region validation
      jest.spyOn(engine, "getDisplays").mockResolvedValue([
        {
          id: "default",
          name: "Default",
          resolution: { width: 1920, height: 1080 },
          position: { x: 0, y: 0 },
          isPrimary: true,
        },
      ]);

      const buffer = await engine.captureRegion(0, 0, 100, 100);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("CopyFromScreen"),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("getDisplays", () => {
    it("should parse display info correctly", async () => {
      const mockOutput = JSON.stringify([
        {
          id: "Display1",
          name: "Display1",
          width: 1920,
          height: 1080,
          x: 0,
          y: 0,
          primary: true,
        },
      ]);
      mockExecSuccess(mockOutput);

      const displays = await engine.getDisplays();
      expect(displays).toHaveLength(1);
      expect(displays[0]).toEqual({
        id: "Display1",
        name: "Display1",
        resolution: { width: 1920, height: 1080 },
        position: { x: 0, y: 0 },
        isPrimary: true,
      });
    });

    it("should handle single display object (not array)", async () => {
      const mockOutput = JSON.stringify({
        id: "Display1",
        name: "Display1",
        width: 1920,
        height: 1080,
        x: 0,
        y: 0,
        primary: true,
      });
      mockExecSuccess(mockOutput);

      const displays = await engine.getDisplays();
      expect(displays).toHaveLength(1);
    });

    it("should return default display on error", async () => {
      mockExecError(new Error("Failed"));

      const displays = await engine.getDisplays();
      expect(displays).toHaveLength(1);
      expect(displays[0].id).toBe("default");
    });
  });

  describe("getWindows", () => {
    it("should parse window info correctly", async () => {
      const mockOutput = JSON.stringify([
        {
          id: 12345,
          title: "Test Window",
          processId: 100,
          x: 10,
          y: 10,
          width: 800,
          height: 600,
          isMinimized: false,
        },
      ]);
      mockExecSuccess(mockOutput);

      const windows = await engine.getWindows();
      expect(windows).toHaveLength(1);
      expect(windows[0]).toEqual({
        id: "12345",
        title: "Test Window",
        pid: 100,
        processName: undefined,
        bounds: { x: 10, y: 10, width: 800, height: 600 },
        isMinimized: false,
      });
    });

    it("should return empty array on error", async () => {
      mockExecError(new Error("Failed"));

      const windows = await engine.getWindows();
      expect(windows).toEqual([]);
    });
  });
});
