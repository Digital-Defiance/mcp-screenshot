/**
 * Base capture engine implementation
 */

import { ICaptureEngine } from "../interfaces";
import { DisplayInfo, WindowInfo } from "../types";
import { RegionValidator, ValidatedRegion } from "./region-validator";

/**
 * Abstract base class for platform-specific capture engines
 */
export abstract class BaseCaptureEngine implements ICaptureEngine {
  protected regionValidator: RegionValidator;

  constructor() {
    this.regionValidator = new RegionValidator();
  }

  abstract captureScreen(displayId?: string): Promise<Buffer>;
  abstract captureWindow(
    windowId: string,
    includeFrame: boolean
  ): Promise<Buffer>;

  /**
   * Capture a region with validation and boundary clipping
   * This is the public interface that validates coordinates and clips to boundaries
   */
  async captureRegion(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    // Validate coordinates and dimensions first to fail fast
    // This avoids unnecessary calls to getDisplays() if inputs are invalid
    this.regionValidator.validateCoordinates(x, y, width, height);

    // Get displays for boundary validation
    const displays = await this.getDisplays();

    // Validate and clip region to boundaries
    const validatedRegion = this.regionValidator.clipToBoundaries(
      x,
      y,
      width,
      height,
      displays
    );

    // Use the clipped coordinates for actual capture
    return this.captureRegionInternal(
      validatedRegion.x,
      validatedRegion.y,
      validatedRegion.width,
      validatedRegion.height
    );
  }

  /**
   * Platform-specific region capture implementation
   * Subclasses should implement this method instead of captureRegion
   */
  protected abstract captureRegionInternal(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer>;

  abstract getDisplays(): Promise<DisplayInfo[]>;
  abstract getWindows(): Promise<WindowInfo[]>;
  abstract getWindowById(windowId: string): Promise<WindowInfo | null>;
  abstract getWindowByTitle(titlePattern: string): Promise<WindowInfo | null>;

  /**
   * Detect the current platform
   */
  protected getPlatform(): "linux" | "darwin" | "win32" {
    return process.platform as "linux" | "darwin" | "win32";
  }

  /**
   * Check if running on Linux
   */
  protected isLinux(): boolean {
    return this.getPlatform() === "linux";
  }

  /**
   * Check if running on macOS
   */
  protected isMacOS(): boolean {
    return this.getPlatform() === "darwin";
  }

  /**
   * Check if running on Windows
   */
  protected isWindows(): boolean {
    return this.getPlatform() === "win32";
  }
}
