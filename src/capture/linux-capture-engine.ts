/**
 * Linux capture engine implementation (X11/Wayland)
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
 * Linux-specific capture engine supporting both X11 and Wayland
 */
export class LinuxCaptureEngine extends BaseCaptureEngine {
  private displayServer: "x11" | "wayland" | null = null;

  /**
   * Detect the display server type (X11 or Wayland)
   */
  private async detectDisplayServer(): Promise<"x11" | "wayland"> {
    if (this.displayServer) {
      return this.displayServer;
    }

    // Check for Wayland
    if (process.env["WAYLAND_DISPLAY"]) {
      this.displayServer = "wayland";
      return "wayland";
    }

    // Check for X11
    if (process.env["DISPLAY"]) {
      this.displayServer = "x11";
      return "x11";
    }

    // Default to X11 if neither is explicitly set
    this.displayServer = "x11";
    return "x11";
  }

  /**
   * Capture full screen or specific display
   */
  async captureScreen(displayId?: string): Promise<Buffer> {
    const displayServer = await this.detectDisplayServer();

    try {
      if (displayServer === "wayland") {
        return await this.captureScreenWayland(displayId);
      } else {
        return await this.captureScreenX11(displayId);
      }
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to capture screen: ${(error as Error).message}`,
        { displayId, displayServer, error }
      );
    }
  }

  /**
   * Capture screen using X11 (import command)
   */
  private async captureScreenX11(displayId?: string): Promise<Buffer> {
    try {
      // Use import command from ImageMagick
      const display = displayId || process.env["DISPLAY"] || ":0";
      const { stdout } = await execAsync(
        `DISPLAY=${display} import -window root png:-`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        }
      );

      return stdout as Buffer;
    } catch (error) {
      throw new CaptureFailedError(
        `X11 capture failed: ${(error as Error).message}`,
        { displayId, error }
      );
    }
  }

  /**
   * Capture screen using Wayland (grim)
   */
  private async captureScreenWayland(displayId?: string): Promise<Buffer> {
    try {
      // Use grim for Wayland
      const outputArg = displayId ? `-o ${displayId}` : "";
      const { stdout } = await execAsync(`grim ${outputArg} -`, {
        encoding: "buffer",
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      return stdout as Buffer;
    } catch (error) {
      throw new CaptureFailedError(
        `Wayland capture failed: ${(error as Error).message}`,
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

    const displayServer = await this.detectDisplayServer();

    try {
      if (displayServer === "wayland") {
        return await this.captureWindowWayland(windowId, includeFrame);
      } else {
        return await this.captureWindowX11(windowId, includeFrame);
      }
    } catch (error) {
      if (error instanceof WindowNotFoundError) {
        throw error;
      }
      throw new CaptureFailedError(
        `Failed to capture window: ${(error as Error).message}`,
        { windowId, includeFrame, displayServer, error }
      );
    }
  }

  /**
   * Capture window using X11
   */
  private async captureWindowX11(
    windowId: string,
    includeFrame: boolean
  ): Promise<Buffer> {
    try {
      const frameArg = includeFrame ? "-frame" : "";
      const { stdout } = await execAsync(
        `import ${frameArg} -window ${windowId} png:-`,
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
   * Capture window using Wayland (grim + slurp)
   */
  private async captureWindowWayland(
    windowId: string,
    includeFrame: boolean
  ): Promise<Buffer> {
    try {
      // Get window geometry
      const window = await this.getWindowById(windowId);
      if (!window) {
        throw new WindowNotFoundError(`Window ${windowId} not found`);
      }

      // Use grim with geometry
      const { x, y, width, height } = window.bounds;
      const { stdout } = await execAsync(
        `grim -g "${x},${y} ${width}x${height}" -`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      return stdout as Buffer;
    } catch (error) {
      if (error instanceof WindowNotFoundError) {
        throw error;
      }
      throw new CaptureFailedError(
        `Wayland window capture failed: ${(error as Error).message}`,
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
    const displayServer = await this.detectDisplayServer();

    try {
      if (displayServer === "wayland") {
        return await this.captureRegionWayland(x, y, width, height);
      } else {
        return await this.captureRegionX11(x, y, width, height);
      }
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to capture region: ${(error as Error).message}`,
        { x, y, width, height, displayServer, error }
      );
    }
  }

  /**
   * Capture region using X11
   */
  private async captureRegionX11(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const { stdout } = await execAsync(
        `import -window root -crop ${width}x${height}+${x}+${y} png:-`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      return stdout as Buffer;
    } catch (error) {
      throw new CaptureFailedError(
        `X11 region capture failed: ${(error as Error).message}`,
        { x, y, width, height, error }
      );
    }
  }

  /**
   * Capture region using Wayland
   */
  private async captureRegionWayland(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const { stdout } = await execAsync(
        `grim -g "${x},${y} ${width}x${height}" -`,
        {
          encoding: "buffer",
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      return stdout as Buffer;
    } catch (error) {
      throw new CaptureFailedError(
        `Wayland region capture failed: ${(error as Error).message}`,
        { x, y, width, height, error }
      );
    }
  }

  /**
   * Get all available displays
   */
  async getDisplays(): Promise<DisplayInfo[]> {
    const displayServer = await this.detectDisplayServer();

    try {
      if (displayServer === "wayland") {
        return await this.getDisplaysWayland();
      } else {
        return await this.getDisplaysX11();
      }
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to get displays: ${(error as Error).message}`,
        { displayServer, error }
      );
    }
  }

  /**
   * Get displays using X11 (xrandr)
   */
  private async getDisplaysX11(): Promise<DisplayInfo[]> {
    try {
      const { stdout } = await execAsync("xrandr --query");
      const displays: DisplayInfo[] = [];
      const lines = stdout.split("\n");

      let isPrimary = false;
      for (const line of lines) {
        // Match connected displays: "HDMI-1 connected primary 1920x1080+0+0"
        const match = line.match(
          /^(\S+)\s+connected\s+(primary\s+)?(\d+)x(\d+)\+(\d+)\+(\d+)/
        );
        if (match) {
          const [, name, primary, width, height, x, y] = match;
          isPrimary = !!primary;

          displays.push({
            id: name,
            name: name,
            resolution: {
              width: parseInt(width, 10),
              height: parseInt(height, 10),
            },
            position: {
              x: parseInt(x, 10),
              y: parseInt(y, 10),
            },
            isPrimary,
          });
        }
      }

      // If no primary found, mark first as primary
      if (displays.length > 0 && !displays.some((d) => d.isPrimary)) {
        displays[0].isPrimary = true;
      }

      return displays;
    } catch (error) {
      // Fallback to basic display info
      return [
        {
          id: "default",
          name: "Default Display",
          resolution: { width: 1920, height: 1080 },
          position: { x: 0, y: 0 },
          isPrimary: true,
        },
      ];
    }
  }

  /**
   * Get displays using Wayland (wlr-randr or swaymsg)
   */
  private async getDisplaysWayland(): Promise<DisplayInfo[]> {
    try {
      // Try wlr-randr first
      const { stdout } = await execAsync("wlr-randr");
      const displays: DisplayInfo[] = [];
      const lines = stdout.split("\n");

      let currentDisplay: Partial<DisplayInfo> | null = null;

      for (const line of lines) {
        // Match display name
        const nameMatch = line.match(/^(\S+)/);
        if (nameMatch && !line.includes("  ")) {
          if (currentDisplay && currentDisplay.id) {
            displays.push(currentDisplay as DisplayInfo);
          }
          currentDisplay = {
            id: nameMatch[1],
            name: nameMatch[1],
            isPrimary: false,
          };
        }

        // Match resolution and position
        if (currentDisplay) {
          const resMatch = line.match(/(\d+)x(\d+)/);
          if (resMatch) {
            currentDisplay.resolution = {
              width: parseInt(resMatch[1], 10),
              height: parseInt(resMatch[2], 10),
            };
          }

          const posMatch = line.match(/Position:\s*(\d+),(\d+)/);
          if (posMatch) {
            currentDisplay.position = {
              x: parseInt(posMatch[1], 10),
              y: parseInt(posMatch[2], 10),
            };
          }
        }
      }

      if (currentDisplay && currentDisplay.id) {
        displays.push(currentDisplay as DisplayInfo);
      }

      // Mark first as primary
      if (displays.length > 0) {
        displays[0].isPrimary = true;
      }

      return displays;
    } catch (error) {
      // Fallback
      return [
        {
          id: "default",
          name: "Default Display",
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
    const displayServer = await this.detectDisplayServer();

    try {
      if (displayServer === "wayland") {
        return await this.getWindowsWayland();
      } else {
        return await this.getWindowsX11();
      }
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to get windows: ${(error as Error).message}`,
        { displayServer, error }
      );
    }
  }

  /**
   * Get windows using X11 (wmctrl or xdotool)
   */
  private async getWindowsX11(): Promise<WindowInfo[]> {
    try {
      const { stdout } = await execAsync("wmctrl -lGp");
      const windows: WindowInfo[] = [];
      const lines = stdout.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        // Format: window_id desktop pid x y width height client_machine window_title
        const parts = line.trim().split(/\s+/);
        if (parts.length < 8) continue;

        const [windowId, , pid, x, y, width, height, , ...titleParts] = parts;
        const title = titleParts.join(" ");

        // Get process name
        let processName = "unknown";
        try {
          const { stdout: psOut } = await execAsync(`ps -p ${pid} -o comm=`);
          processName = psOut.trim();
        } catch {
          // Ignore errors getting process name
        }

        windows.push({
          id: windowId,
          title,
          processName,
          pid: parseInt(pid, 10),
          bounds: {
            x: parseInt(x, 10),
            y: parseInt(y, 10),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
          },
          isMinimized: false, // wmctrl doesn't easily show this
        });
      }

      return windows;
    } catch (error) {
      // Return empty array if wmctrl not available
      return [];
    }
  }

  /**
   * Get windows using Wayland (swaymsg)
   */
  private async getWindowsWayland(): Promise<WindowInfo[]> {
    try {
      const { stdout } = await execAsync("swaymsg -t get_tree");
      const tree = JSON.parse(stdout);
      const windows: WindowInfo[] = [];

      // Recursively find windows
      const findWindows = (node: any) => {
        if (node.type === "con" && node.name && node.pid) {
          windows.push({
            id: node.id.toString(),
            title: node.name,
            processName: node.app_id || "unknown",
            pid: node.pid,
            bounds: {
              x: node.rect.x,
              y: node.rect.y,
              width: node.rect.width,
              height: node.rect.height,
            },
            isMinimized: !node.visible,
          });
        }

        if (node.nodes) {
          node.nodes.forEach(findWindows);
        }
        if (node.floating_nodes) {
          node.floating_nodes.forEach(findWindows);
        }
      };

      findWindows(tree);
      return windows;
    } catch (error) {
      // Return empty array if swaymsg not available
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
