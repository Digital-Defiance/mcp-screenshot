/**
 * macOS capture engine implementation
 */

import { exec } from "child_process";
import { promisify } from "util";
import { BaseCaptureEngine } from "./base-capture-engine";
import { DisplayInfo, WindowInfo } from "../types";
import {
  CaptureFailedError,
  DisplayNotFoundError,
  WindowNotFoundError,
} from "../errors";

const execAsync = promisify(exec);

/**
 * macOS-specific capture engine
 */
export class MacOSCaptureEngine extends BaseCaptureEngine {
  /**
   * Capture full screen or specific display
   */
  async captureScreen(displayId?: string): Promise<Buffer> {
    try {
      // Use screencapture command
      // -x: no sound
      // -t: format (png)
      // -D: display ID
      const displayArg = displayId ? `-D ${displayId}` : "";
      const { stdout } = await execAsync(
        `screencapture -x -t png ${displayArg} -`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        }
      );

      return stdout as Buffer;
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to capture screen: ${(error as Error).message}`,
        { displayId, error }
      );
    }
  }

  /**
   * Capture a specific window
   */
  async captureWindow(
    windowId: string,
    includeFrame: boolean
  ): Promise<Buffer> {
    // Validate window exists and is visible
    const window = await this.getWindowById(windowId);
    if (!window) {
      throw new WindowNotFoundError(`Window ${windowId} not found`, {
        windowId,
      });
    }

    if (window.isMinimized) {
      throw new WindowNotFoundError(
        `Cannot capture minimized window ${windowId}`,
        { windowId, isMinimized: true }
      );
    }

    try {
      // Use screencapture with window ID
      // -l: window ID
      // -o: include window frame (if includeFrame is true, we don't use -o which excludes shadow)
      const frameArg = includeFrame ? "" : "-o";
      const { stdout } = await execAsync(
        `screencapture -x -t png ${frameArg} -l ${windowId} -`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      return stdout as Buffer;
    } catch (error) {
      throw new WindowNotFoundError(
        `Window ${windowId} not found or not capturable`,
        { windowId, error }
      );
    }
  }

  /**
   * Capture a specific region (internal implementation)
   */
  protected async captureRegionInternal(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      // Use screencapture with region
      // -R: x,y,width,height
      const { stdout } = await execAsync(
        `screencapture -x -t png -R ${x},${y},${width},${height} -`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      return stdout as Buffer;
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to capture region: ${(error as Error).message}`,
        { x, y, width, height, error }
      );
    }
  }

  /**
   * Get all available displays
   */
  async getDisplays(): Promise<DisplayInfo[]> {
    try {
      // Use system_profiler to get display information
      const { stdout } = await execAsync(
        "system_profiler SPDisplaysDataType -json"
      );
      const data = JSON.parse(stdout);

      const displays: DisplayInfo[] = [];
      let displayIndex = 1;

      // Parse display information
      if (data.SPDisplaysDataType) {
        for (const gpu of data.SPDisplaysDataType) {
          if (gpu.spdisplays_ndrvs) {
            for (const display of gpu.spdisplays_ndrvs) {
              const resolution = display._spdisplays_resolution || "";
              const match = resolution.match(/(\d+)\s*x\s*(\d+)/);

              if (match) {
                displays.push({
                  id: displayIndex.toString(),
                  name: display._name || `Display ${displayIndex}`,
                  resolution: {
                    width: parseInt(match[1], 10),
                    height: parseInt(match[2], 10),
                  },
                  position: {
                    x:
                      displayIndex === 1
                        ? 0
                        : displays[displayIndex - 2].resolution.width,
                    y: 0,
                  },
                  isPrimary: displayIndex === 1,
                });
                displayIndex++;
              }
            }
          }
        }
      }

      // Fallback if no displays found
      if (displays.length === 0) {
        displays.push({
          id: "1",
          name: "Main Display",
          resolution: { width: 1920, height: 1080 },
          position: { x: 0, y: 0 },
          isPrimary: true,
        });
      }

      return displays;
    } catch (error) {
      // Fallback to basic display info
      return [
        {
          id: "1",
          name: "Main Display",
          resolution: { width: 1920, height: 1080 },
          position: { x: 0, y: 0 },
          isPrimary: true,
        },
      ];
    }
  }

  /**
   * Get all visible windows
   */
  async getWindows(): Promise<WindowInfo[]> {
    try {
      // Use AppleScript to get window information
      const script = `
        tell application "System Events"
          set windowList to {}
          repeat with proc in (every process whose background only is false)
            try
              set procName to name of proc
              set procPID to unix id of proc
              repeat with win in (every window of proc)
                try
                  set winTitle to name of win
                  set winPos to position of win
                  set winSize to size of win
                  set winID to id of win
                  set end of windowList to {procName, procPID, winTitle, winID, item 1 of winPos, item 2 of winPos, item 1 of winSize, item 2 of winSize}
                end try
              end repeat
            end try
          end repeat
          return windowList
        end tell
      `;

      const { stdout } = await execAsync(
        `osascript -e '${script.replace(/'/g, "'\\''")}'`
      );
      const windows: WindowInfo[] = [];

      // Parse AppleScript output
      // Format: processName, pid, title, id, x, y, width, height
      const lines = stdout.trim().split(", ");

      // Group by 8 items
      for (let i = 0; i < lines.length; i += 8) {
        if (i + 7 < lines.length) {
          windows.push({
            id: lines[i + 3],
            title: lines[i + 2],
            processName: lines[i],
            pid: parseInt(lines[i + 1], 10),
            bounds: {
              x: parseInt(lines[i + 4], 10),
              y: parseInt(lines[i + 5], 10),
              width: parseInt(lines[i + 6], 10),
              height: parseInt(lines[i + 7], 10),
            },
            isMinimized: false,
          });
        }
      }

      return windows;
    } catch (error) {
      // Return empty array if AppleScript fails
      return [];
    }
  }

  /**
   * Get a window by its ID
   */
  async getWindowById(windowId: string): Promise<WindowInfo | null> {
    const windows = await this.getWindows();
    return windows.find((w) => w.id === windowId) || null;
  }

  /**
   * Get a window by title pattern
   */
  async getWindowByTitle(titlePattern: string): Promise<WindowInfo | null> {
    const windows = await this.getWindows();
    const regex = new RegExp(titlePattern, "i");
    return windows.find((w) => regex.test(w.title)) || null;
  }
}
