import { createCaptureEngine } from "./index";
import { LinuxCaptureEngine } from "./linux-capture-engine";
import { MacOSCaptureEngine } from "./macos-capture-engine";
import { WindowsCaptureEngine } from "./windows-capture-engine";
import { WSLCaptureEngine } from "./wsl-capture-engine";
import * as fs from "fs";

jest.mock("fs");

describe("createCaptureEngine", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
    jest.clearAllMocks();
  });

  it("should return LinuxCaptureEngine on Linux (non-WSL)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(
      "Linux version 5.4.0-generic"
    );

    const engine = createCaptureEngine();
    expect(engine).toBeInstanceOf(LinuxCaptureEngine);
  });

  it("should return WSLCaptureEngine on Linux (WSL)", () => {
    Object.defineProperty(process, "platform", {
      value: "linux",
    });
    (fs.readFileSync as jest.Mock).mockReturnValue(
      "Linux version 5.10.16.3-microsoft-standard-WSL2"
    );

    const engine = createCaptureEngine();
    expect(engine).toBeInstanceOf(WSLCaptureEngine);
  });

  it("should return MacOSCaptureEngine on Darwin", () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
    });

    const engine = createCaptureEngine();
    expect(engine).toBeInstanceOf(MacOSCaptureEngine);
  });

  it("should return WindowsCaptureEngine on Win32", () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });

    const engine = createCaptureEngine();
    expect(engine).toBeInstanceOf(WindowsCaptureEngine);
  });

  it("should throw error on unsupported platform", () => {
    Object.defineProperty(process, "platform", {
      value: "sunos",
    });

    expect(() => createCaptureEngine()).toThrow("Unsupported platform: sunos");
  });
});
