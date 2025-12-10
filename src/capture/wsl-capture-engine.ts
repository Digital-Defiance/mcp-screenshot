/**
 * WSL capture engine implementation
 * Uses powershell.exe to capture Windows host screen from WSL
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
 * WSL-specific capture engine
 */
export class WSLCaptureEngine extends BaseCaptureEngine {
  /**
   * Execute a PowerShell command on the Windows host
   */
  private async runPowerShell(command: string): Promise<string> {
    // Escape double quotes for the shell
    // AND escape $ signs so the Linux shell doesn't expand them
    const escapedCommand = command
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`"); // Also escape backticks just in case

    // Use powershell.exe from Windows
    // Increase maxBuffer to 50MB to handle large base64 image output
    const { stdout, stderr } = await execAsync(
      `powershell.exe -NoProfile -NonInteractive -Command "${escapedCommand}"`,
      {
        maxBuffer: 50 * 1024 * 1024,
        shell: "/bin/bash", // Use bash which has Windows paths in WSL
      }
    );

    if (stderr && !stderr.includes("CLM")) {
      // console.warn("PowerShell stderr:", stderr);
    }

    return stdout.trim();
  }

  /**
   * Capture full screen or specific display
   */
  async captureScreen(displayId?: string): Promise<Buffer> {
    try {
      const script = `
        # Try to set DPI awareness to capture full resolution
        try {
          $user32 = Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();' -Name "User32" -Namespace Win32 -PassThru
          $user32::SetProcessDPIAware() | Out-Null
        } catch {
          # Ignore if already set or fails
        }

        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $screens = [System.Windows.Forms.Screen]::AllScreens
        $screen = $null
        
        if ("${displayId}" -ne "") {
            $screen = $screens | Where-Object { $_.DeviceName -eq "${displayId}" }
        }
        
        if ($null -eq $screen) {
            $screen = [System.Windows.Forms.Screen]::PrimaryScreen
        }
        
        $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
        
        $ms = New-Object System.IO.MemoryStream
        $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        [Convert]::ToBase64String($ms.ToArray())
      `;

      const base64 = await this.runPowerShell(script);
      if (!base64) {
        throw new Error("Empty output from PowerShell");
      }
      return Buffer.from(base64, "base64");
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
    try {
      const script = `
        # Try to set DPI awareness
        try {
          $user32 = Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();' -Name "User32" -Namespace Win32 -PassThru
          $user32::SetProcessDPIAware() | Out-Null
        } catch {
          # Ignore
        }

        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;

        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public struct POINT {
            public int X;
            public int Y;
        }

        public class User32 {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            public static extern bool GetClientRect(IntPtr hwnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            public static extern bool ClientToScreen(IntPtr hwnd, ref POINT lpPoint);
            
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hwnd);
        }
"@ | Out-Null

        $hwnd = [IntPtr]${windowId}
        
        if ([User32]::IsIconic($hwnd)) {
            throw "Window is minimized"
        }

        $x = 0
        $y = 0
        $width = 0
        $height = 0

        if ($${includeFrame}) {
            $rect = New-Object RECT
            [User32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
            $x = $rect.Left
            $y = $rect.Top
            $width = $rect.Right - $rect.Left
            $height = $rect.Bottom - $rect.Top
        } else {
            $rect = New-Object RECT
            [User32]::GetClientRect($hwnd, [ref]$rect) | Out-Null
            $pt = New-Object POINT
            $pt.X = 0
            $pt.Y = 0
            [User32]::ClientToScreen($hwnd, [ref]$pt) | Out-Null
            
            $x = $pt.X
            $y = $pt.Y
            $width = $rect.Right
            $height = $rect.Bottom
        }
        
        if ($width -le 0 -or $height -le 0) {
            throw "Invalid window dimensions"
        }
        
        Add-Type -AssemblyName System.Drawing | Out-Null
        $bitmap = New-Object System.Drawing.Bitmap $width, $height
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($x, $y, 0, 0, $bitmap.Size)
        
        $ms = New-Object System.IO.MemoryStream
        $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        [Convert]::ToBase64String($ms.ToArray())
      `;

      const base64 = await this.runPowerShell(script);
      return Buffer.from(base64, "base64");
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("Window is minimized")) {
        throw new WindowNotFoundError(
          `Cannot capture minimized window ${windowId}`,
          { windowId, isMinimized: true }
        );
      }
      throw new CaptureFailedError(`Failed to capture window: ${message}`, {
        windowId,
        error,
      });
    }
  }

  /**
   * Capture a specific region
   */
  protected async captureRegionInternal(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer> {
    try {
      const script = `
        # Try to set DPI awareness
        try {
          $user32 = Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();' -Name "User32" -Namespace Win32 -PassThru
          $user32::SetProcessDPIAware() | Out-Null
        } catch {
          # Ignore
        }

        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $bitmap = New-Object System.Drawing.Bitmap ${width}, ${height}
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen(${x}, ${y}, 0, 0, $bitmap.Size)
        
        $ms = New-Object System.IO.MemoryStream
        $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        [Convert]::ToBase64String($ms.ToArray())
      `;

      const base64 = await this.runPowerShell(script);
      return Buffer.from(base64, "base64");
    } catch (error) {
      throw new CaptureFailedError(
        `Failed to capture region: ${(error as Error).message}`,
        { x, y, width, height, error }
      );
    }
  }

  /**
   * Get list of connected displays
   */
  async getDisplays(): Promise<DisplayInfo[]> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;

        public class User32 {
            [DllImport("user32.dll")]
            public static extern bool SetProcessDPIAware();
        }
"@ | Out-Null

        [User32]::SetProcessDPIAware() | Out-Null
        Add-Type -AssemblyName System.Windows.Forms | Out-Null
        [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
            @{
                id = $_.DeviceName
                name = $_.DeviceName
                x = $_.Bounds.X
                y = $_.Bounds.Y
                width = $_.Bounds.Width
                height = $_.Bounds.Height
                primary = $_.Primary
            }
        } | ConvertTo-Json
      `;

      const json = await this.runPowerShell(script);
      const data = JSON.parse(json);
      const screens = Array.isArray(data) ? data : [data];

      return screens.map((s: any) => ({
        id: s.id,
        name: s.name,
        resolution: {
          width: s.width,
          height: s.height,
        },
        position: {
          x: s.x,
          y: s.y,
        },
        isPrimary: s.primary,
      }));
    } catch (error) {
      // Fallback to default if detection fails
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
   * Get list of visible windows
   */
  async getWindows(): Promise<WindowInfo[]> {
    try {
      const script = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;

        public struct RECT {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        public class User32 {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            public static extern bool IsIconic(IntPtr hwnd);

            [DllImport("user32.dll")]
            public static extern bool SetProcessDPIAware();
        }
"@ | Out-Null

        [User32]::SetProcessDPIAware() | Out-Null

        Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | ForEach-Object {
            $hwnd = $_.MainWindowHandle
            $rect = New-Object RECT
            [User32]::GetWindowRect($hwnd, [ref]$rect)
            $isMinimized = [User32]::IsIconic($hwnd)
            
            @{
                id = $hwnd.ToString()
                title = $_.MainWindowTitle
                processId = $_.Id
                processName = $_.ProcessName
                x = $rect.Left
                y = $rect.Top
                width = $rect.Right - $rect.Left
                height = $rect.Bottom - $rect.Top
                isMinimized = $isMinimized
            }
        } | ConvertTo-Json
      `;

      const json = await this.runPowerShell(script);
      // Handle empty or single object result
      if (!json) return [];

      const data = JSON.parse(json);
      const windows = Array.isArray(data) ? data : [data];

      return windows
        .filter((w: any) => typeof w === "object" && w !== null && w.id)
        .map((w: any) => ({
          id: String(w.id),
          title: w.title,
          pid: w.processId,
          processName: w.processName,
          bounds: {
            x: w.x || 0,
            y: w.y || 0,
            width: w.width || 0,
            height: w.height || 0,
          },
          isMinimized: !!w.isMinimized,
        }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get window by ID
   */
  async getWindowById(windowId: string): Promise<WindowInfo | null> {
    const windows = await this.getWindows();
    return windows.find((w) => w.id === windowId) || null;
  }

  /**
   * Get window by title pattern
   */
  async getWindowByTitle(titlePattern: string): Promise<WindowInfo | null> {
    const windows = await this.getWindows();
    const regex = new RegExp(titlePattern, "i");
    return windows.find((w) => regex.test(w.title)) || null;
  }
}
