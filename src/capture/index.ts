/**
 * Capture engine module
 *
 * Provides platform-specific screenshot capture capabilities for Linux, macOS, and Windows.
 *
 * @module capture
 */

export * from "./base-capture-engine";
export * from "./linux-capture-engine";
export * from "./macos-capture-engine";
export * from "./windows-capture-engine";
export * from "./region-validator";

import { BaseCaptureEngine } from "./base-capture-engine";
import { LinuxCaptureEngine } from "./linux-capture-engine";
import { MacOSCaptureEngine } from "./macos-capture-engine";
import { WindowsCaptureEngine } from "./windows-capture-engine";

/**
 * Create a platform-specific capture engine
 *
 * Factory function that returns the appropriate capture engine implementation
 * based on the current operating system platform.
 *
 * @returns {BaseCaptureEngine} Platform-specific capture engine instance
 * @throws {Error} If the current platform is not supported
 *
 * @example
 * ```typescript
 * import { createCaptureEngine } from '@ai-capabilities-suite/mcp-screenshot';
 *
 * const engine = createCaptureEngine();
 * const buffer = await engine.captureScreen();
 * ```
 *
 * @remarks
 * Platform-specific behavior:
 * - **Linux**: Uses X11 (import/xwd) or Wayland (grim) depending on display server
 * - **macOS**: Uses native screencapture command with Retina display support
 * - **Windows**: Uses screenshot-desktop library with high-DPI support
 */
export function createCaptureEngine(): BaseCaptureEngine {
  const platform = process.platform;

  switch (platform) {
    case "linux":
      return new LinuxCaptureEngine();
    case "darwin":
      return new MacOSCaptureEngine();
    case "win32":
      return new WindowsCaptureEngine();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
