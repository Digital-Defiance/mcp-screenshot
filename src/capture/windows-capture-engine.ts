/**
 * Windows capture engine implementation
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
 * Windows-specific capture engine
 */
export class WindowsCaptureEngine extends BaseCaptureEngine {
  /**
   * Capture full screen or specific display
   */
  async captureScreen(displayId?: string): Promise<Buffer> {
    try {
      // Use screenshot-desktop library for Windows
      const screenshot = await import("screenshot-desktop");

      // If displayId is provided, capture that specific display
      const options: any = { format: "png" };
      if (displayId) {
        options.screen = parseInt(displayId, 10);
      }

      const buffer = await screenshot.default(options);
      if (!buffer || buffer.length === 0) {
        throw new CaptureFailedError(
          "Screenshot capture returned empty buffer (headless environment?)",
          { displayId }
        );
      }
      return buffer;
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
      // Use PowerShell to capture window
      // This is a simplified implementation - in production, you'd use native Windows APIs
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $hwnd = [int]${windowId}
        $rect = New-Object RECT
        [Win32]::GetWindowRect($hwnd, [ref]$rect)
        
        $width = $rect.Right - $rect.Left
        $height = $rect.Bottom - $rect.Top
        
        $bitmap = New-Object System.Drawing.Bitmap($width, $height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
        
        $ms = New-Object System.IO.MemoryStream
        $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        [Convert]::ToBase64String($ms.ToArray())
      `;

      const { stdout } = await execAsync(
        `powershell -Command "${script.replace(/"/g, '\\"')}"`,
        {
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      const buffer = Buffer.from(stdout.trim(), "base64");
      if (!buffer || buffer.length === 0) throw new CaptureFailedError("Empty buffer from PowerShell", {});
      return buffer;
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
      // Use PowerShell to capture region
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $bitmap = New-Object System.Drawing.Bitmap(${width}, ${height})
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen(${x}, ${y}, 0, 0, $bitmap.Size)
        
        $ms = New-Object System.IO.MemoryStream
        $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        [Convert]::ToBase64String($ms.ToArray())
      `;

      const { stdout, stderr } = await execAsync(
        `powershell -Command "${script.replace(/"/g, '\\"')}"`,
        {
          maxBuffer: 50 * 1024 * 1024,
        }
      );

      const output = stdout.trim();
      if (!output || output.length === 0) {
        throw new CaptureFailedError(
          `PowerShell returned empty output (headless CI?). stderr: ${stderr}`,
          { x, y, width, height }
        );
      }
      
      const buffer = Buffer.from(output, "base64");
      if (!buffer || buffer.length === 0) {
        throw new CaptureFailedError(
          "Failed to decode base64 from PowerShell",
          { x, y, width, height, outputLength: output.length }
        );
      }
      return buffer;
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
      // Use PowerShell to get display information
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        $screens = [System.Windows.Forms.Screen]::AllScreens
        $screens | ForEach-Object {
          $isPrimary = $_.Primary
          $bounds = $_.Bounds
          "$($_.DeviceName)|$isPrimary|$($bounds.Width)|$($bounds.Height)|$($bounds.X)|$($bounds.Y)"
        }
      `;

      const { stdout } = await execAsync(
        `powershell -Command "${script.replace(/"/g, '\\"')}"`
      );

      const displays: DisplayInfo[] = [];
      const lines = stdout.trim().split("\n");

      lines.forEach((line, index) => {
        const parts = line.trim().split("|");
        if (parts.length === 6) {
          displays.push({
            id: index.toString(),
            name: parts[0],
            resolution: {
              width: parseInt(parts[2], 10),
              height: parseInt(parts[3], 10),
            },
            position: {
              x: parseInt(parts[4], 10),
              y: parseInt(parts[5], 10),
            },
            isPrimary: parts[1].toLowerCase() === "true",
          });
        }
      });

      // Fallback if no displays found
      if (displays.length === 0) {
        displays.push({
          id: "0",
          name: "Primary Display",
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
          id: "0",
          name: "Primary Display",
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
      // Use PowerShell to get window information
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          using System.Text;
          public class Win32 {
            [DllImport("user32.dll")]
            public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
            [DllImport("user32.dll")]
            public static extern bool IsWindowVisible(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
            [DllImport("user32.dll")]
            public static extern int GetWindowTextLength(IntPtr hWnd);
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [DllImport("user32.dll")]
            public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
            public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
          }
          public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
          }
"@

        $windows = @()
        $callback = {
          param($hwnd, $lParam)
          if ([Win32]::IsWindowVisible($hwnd)) {
            $length = [Win32]::GetWindowTextLength($hwnd)
            if ($length -gt 0) {
              $sb = New-Object System.Text.StringBuilder($length + 1)
              [Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
              $title = $sb.ToString()
              
              $rect = New-Object RECT
              [Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
              
              $pid = 0
              [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid) | Out-Null
              
              $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
              $procName = if ($proc) { $proc.ProcessName } else { "unknown" }
              
              $width = $rect.Right - $rect.Left
              $height = $rect.Bottom - $rect.Top
              
              if ($width -gt 0 -and $height -gt 0) {
                "$hwnd|$title|$procName|$pid|$($rect.Left)|$($rect.Top)|$width|$height"
              }
            }
          }
          return $true
        }
        
        [Win32]::EnumWindows($callback, [IntPtr]::Zero)
      `;

      const { stdout } = await execAsync(
        `powershell -Command "${script.replace(/"/g, '\\"')}"`,
        {
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const windows: WindowInfo[] = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const parts = line.trim().split("|");
        if (parts.length === 8) {
          windows.push({
            id: parts[0],
            title: parts[1],
            processName: parts[2],
            pid: parseInt(parts[3], 10),
            bounds: {
              x: parseInt(parts[4], 10),
              y: parseInt(parts[5], 10),
              width: parseInt(parts[6], 10),
              height: parseInt(parts[7], 10),
            },
            isMinimized: false,
          });
        }
      }

      return windows;
    } catch (error) {
      // Return empty array if PowerShell fails
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
