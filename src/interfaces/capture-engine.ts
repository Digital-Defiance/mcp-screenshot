/**
 * Interface for platform-specific capture engines
 */

import { DisplayInfo, WindowInfo } from "../types";

/**
 * Base interface for screen capture engines
 */
export interface ICaptureEngine {
  /**
   * Capture the full screen or a specific display
   * @param displayId Optional display identifier
   * @returns Buffer containing the captured image
   */
  captureScreen(displayId?: string): Promise<Buffer>;

  /**
   * Capture a specific window
   * @param windowId Window identifier
   * @param includeFrame Whether to include window frame
   * @returns Buffer containing the captured image
   */
  captureWindow(windowId: string, includeFrame: boolean): Promise<Buffer>;

  /**
   * Capture a specific region of the screen
   * @param x X coordinate
   * @param y Y coordinate
   * @param width Width of the region
   * @param height Height of the region
   * @returns Buffer containing the captured image
   */
  captureRegion(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer>;

  /**
   * Get all available displays
   * @returns Array of display information
   */
  getDisplays(): Promise<DisplayInfo[]>;

  /**
   * Get all visible windows
   * @returns Array of window information
   */
  getWindows(): Promise<WindowInfo[]>;

  /**
   * Get a window by its ID
   * @param windowId Window identifier
   * @returns Window information or null if not found
   */
  getWindowById(windowId: string): Promise<WindowInfo | null>;

  /**
   * Get a window by title pattern
   * @param titlePattern Title pattern to match
   * @returns Window information or null if not found
   */
  getWindowByTitle(titlePattern: string): Promise<WindowInfo | null>;
}
