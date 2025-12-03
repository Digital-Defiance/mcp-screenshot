# MCP Screenshot - API Documentation

This document provides comprehensive API documentation for the MCP Screenshot server, including error codes, platform-specific behavior, and type definitions.

## Table of Contents

- [Error Codes](#error-codes)
- [Platform-Specific Behavior](#platform-specific-behavior)
- [Type Definitions](#type-definitions)
- [Public APIs](#public-apis)

## Error Codes

All errors returned by the MCP Screenshot server follow a structured format with error codes and remediation suggestions.

### Error Code Reference

| Error Code | Description | Common Causes | Remediation |
|------------|-------------|---------------|-------------|
| `PERMISSION_DENIED` | Insufficient permissions to capture screenshots | Missing screen recording permission (macOS), insufficient user privileges | Grant Screen Recording permission in System Preferences > Security & Privacy (macOS). Check user permissions on Linux/Windows. |
| `INVALID_PATH` | File path outside allowed directories | Path not in allowedDirectories list, path traversal attempt | Provide a valid file path within configured allowed directories. Check security policy configuration. |
| `WINDOW_NOT_FOUND` | Specified window does not exist | Window closed, window ID invalid, window title pattern doesn't match | Use `screenshot_list_windows` to find available windows. Verify window exists and is visible. |
| `DISPLAY_NOT_FOUND` | Specified display does not exist | Display ID invalid, display disconnected | Use `screenshot_list_displays` to find available displays. Verify display is connected. |
| `UNSUPPORTED_FORMAT` | Requested image format not supported | Invalid format parameter | Use one of the supported formats: png, jpeg, webp, or bmp. |
| `CAPTURE_FAILED` | Screenshot capture operation failed | System API failure, permission issue, resource unavailable | Check system permissions and ensure the target is accessible. Try again or contact support if issue persists. |
| `RATE_LIMIT_EXCEEDED` | Too many captures in time window | Exceeded maxCapturesPerMinute limit | Wait before making additional capture requests. The rate limit will reset after the configured time window (default: 60 seconds). |
| `SECURITY_ERROR` | Generic security policy violation | Various security policy violations | Review the security policy configuration and ensure the operation is allowed. |
| `INVALID_REGION` | Invalid region coordinates or dimensions | Negative coordinates, non-positive dimensions, region out of bounds | Ensure coordinates are non-negative and dimensions are positive. Check that the region is within screen bounds. |
| `OUT_OF_MEMORY` | Insufficient memory for operation | Large capture size, low available memory | Reduce the capture size or quality settings. Close other applications to free up memory. |
| `ENCODING_FAILED` | Image encoding operation failed | Invalid format, insufficient disk space, corrupted image data | Try a different image format or reduce the quality setting. Ensure sufficient disk space is available. |
| `FILE_SYSTEM_ERROR` | File system operation failed | Permission denied, disk full, directory doesn't exist | Check file permissions and ensure the directory exists. Verify sufficient disk space is available. |

### Error Response Format

All errors follow this structure:

```typescript
{
  status: "error",
  error: {
    code: string,           // Error code from table above
    message: string,        // Human-readable error message
    details?: any,          // Additional error context
    remediation?: string    // Suggested fix for the error
  }
}
```

### Example Error Responses

**Window Not Found:**
```json
{
  "status": "error",
  "error": {
    "code": "WINDOW_NOT_FOUND",
    "message": "Window with ID '12345' not found",
    "details": {
      "windowId": "12345"
    },
    "remediation": "Verify the window exists and is visible. Use screenshot_list_windows to see available windows."
  }
}
```

**Rate Limit Exceeded:**
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "agentId": "default",
      "limit": 60,
      "current": 60
    },
    "remediation": "Wait before making additional capture requests. The rate limit will reset after the configured time window."
  }
}
```

**Invalid Path:**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PATH",
    "message": "Path outside allowed directories",
    "details": {
      "path": "/etc/passwd",
      "allowedDirectories": ["/home/user/screenshots", "/tmp"]
    },
    "remediation": "Provide a valid file path within the allowed directories. Check the security policy configuration."
  }
}
```

## Platform-Specific Behavior

The MCP Screenshot server adapts to different operating systems with platform-specific implementations.

### Linux

**Display Servers:**
- **X11**: Uses `import` or `xwd` commands from ImageMagick
- **Wayland**: Uses `grim` command

**Detection:**
- Automatically detects display server from `$DISPLAY` and `$WAYLAND_DISPLAY` environment variables
- Falls back to X11 if both are present

**Requirements:**
```bash
# X11
sudo apt-get install imagemagick

# Wayland
sudo apt-get install grim
```

**Multi-Monitor:**
- Supports multi-monitor setups through X11 RandR or Wayland output protocols
- Display IDs correspond to X11 screen numbers or Wayland output names

**Window Capture:**
- Uses `xdotool` for window enumeration on X11
- Uses `swaymsg` for window enumeration on Wayland (Sway compositor)
- Window IDs are X11 window IDs (hexadecimal) or Wayland app IDs

**Limitations:**
- Wayland support depends on compositor (works with Sway, may not work with GNOME/KDE)
- Some Wayland compositors require additional permissions
- Window frame inclusion may not work consistently across all window managers

### macOS

**Capture Method:**
- Uses native `screencapture` command
- Supports all macOS versions with `screencapture` utility

**Permissions:**
- Requires Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording
- Permission must be granted to the terminal application or Node.js

**Retina Displays:**
- Automatically handles Retina display scaling
- Captured images have 2x resolution on Retina displays
- Metadata reports actual pixel dimensions

**Multi-Monitor:**
- Supports multi-monitor setups
- Display IDs correspond to macOS display numbers
- Primary display is the one with the menu bar

**Window Capture:**
- Uses `osascript` (AppleScript) for window enumeration
- Window IDs are macOS window numbers
- Window frame inclusion uses `-o` flag with `screencapture`

**Limitations:**
- Window capture may include shadows (macOS behavior)
- Some system windows cannot be captured (security restriction)
- Permission dialogs cannot be captured

### Windows

**Capture Method:**
- Uses `screenshot-desktop` npm library
- Leverages Windows Graphics Capture API

**Permissions:**
- No special permissions required for most operations
- Administrator privileges may be required for some system windows

**High-DPI:**
- Automatically handles high-DPI displays
- Scaling factor is applied correctly
- Metadata reports actual pixel dimensions

**Multi-Monitor:**
- Supports multi-monitor setups
- Display IDs correspond to Windows display numbers
- Primary display is the one with the taskbar

**Window Capture:**
- Uses Windows API for window enumeration
- Window IDs are Windows HWND handles (decimal)
- Window frame inclusion captures title bar and borders

**Limitations:**
- Some UWP apps may not be capturable
- Windows Defender may block captures of security-sensitive windows
- Elevated windows require elevated privileges to capture

## Type Definitions

### Core Types

```typescript
/**
 * Supported image formats
 */
type ImageFormat = "png" | "jpeg" | "webp" | "bmp";

/**
 * Display information
 */
interface DisplayInfo {
  id: string;                                    // Platform-specific display identifier
  name: string;                                  // Display name
  resolution: { width: number; height: number }; // Display resolution in pixels
  position: { x: number; y: number };            // Position in virtual desktop
  isPrimary: boolean;                            // Whether this is the primary display
}

/**
 * Window information
 */
interface WindowInfo {
  id: string;                                    // Platform-specific window identifier
  title: string;                                 // Window title
  processName: string;                           // Process name
  pid: number;                                   // Process ID
  bounds: {                                      // Window bounds
    x: number;                                   // X position
    y: number;                                   // Y position
    width: number;                               // Width in pixels
    height: number;                              // Height in pixels
  };
  isMinimized: boolean;                          // Whether window is minimized
}

/**
 * Region information
 */
interface RegionInfo {
  x: number;        // X coordinate of top-left corner
  y: number;        // Y coordinate of top-left corner
  width: number;    // Width in pixels
  height: number;   // Height in pixels
}

/**
 * PII masking statistics
 */
interface MaskingStats {
  emailsRedacted: number;           // Number of email addresses masked
  phonesRedacted: number;           // Number of phone numbers masked
  creditCardsRedacted: number;      // Number of credit card numbers masked
  customPatternsRedacted: number;   // Number of custom patterns masked
}

/**
 * Screenshot metadata
 */
interface ScreenshotMetadata {
  width: number;                    // Image width in pixels
  height: number;                   // Image height in pixels
  format: ImageFormat;              // Image format
  fileSize: number;                 // File size in bytes
  timestamp: string;                // ISO 8601 timestamp
  display?: DisplayInfo;            // Display info (for full screen captures)
  window?: WindowInfo;              // Window info (for window captures)
  region?: RegionInfo;              // Region info (for region captures)
  piiMasking?: MaskingStats;        // PII masking stats (if enabled)
}

/**
 * Screenshot response
 */
interface ScreenshotResponse {
  status: "success" | "error";      // Operation status
  data?: string;                    // Base64-encoded image data (if not saved to file)
  filePath?: string;                // Absolute file path (if saved to file)
  mimeType?: string;                // MIME type (e.g., "image/png")
  metadata?: ScreenshotMetadata;    // Screenshot metadata
  error?: {                         // Error information (if status is "error")
    code: string;                   // Error code
    message: string;                // Error message
    details?: any;                  // Additional error details
    remediation?: string;           // Suggested remediation
  };
}

/**
 * Security policy configuration
 */
interface SecurityPolicy {
  allowedDirectories: string[];     // Allowed directories for saving screenshots
  blockedWindowPatterns: string[];  // Window title patterns to exclude
  maxCapturesPerMinute: number;     // Maximum captures per minute per agent
  enableAuditLog: boolean;          // Whether to enable audit logging
}
```

## Public APIs

### MCPScreenshotServer

Main server class that implements the MCP protocol.

```typescript
class MCPScreenshotServer {
  /**
   * Create a new MCP Screenshot server
   * 
   * @param securityPolicy - Optional security policy configuration
   * @param excludedWindowPatterns - Optional window title patterns to exclude
   */
  constructor(
    securityPolicy?: Partial<SecurityPolicy>,
    excludedWindowPatterns?: string[]
  );

  /**
   * Start the MCP server with stdio transport
   * 
   * @throws Error if server is already running
   */
  async start(): Promise<void>;

  /**
   * Stop the server and cleanup resources
   */
  async stop(): Promise<void>;

  /**
   * Check if server is running
   * 
   * @returns true if server is running, false otherwise
   */
  isServerRunning(): boolean;
}
```

### MCPTools

Tool implementations for screenshot operations.

```typescript
class MCPTools {
  /**
   * Create a new MCPTools instance
   * 
   * @param securityPolicy - Optional security policy configuration
   * @param excludedWindowPatterns - Optional window title patterns to exclude
   */
  constructor(
    securityPolicy?: Partial<SecurityPolicy>,
    excludedWindowPatterns?: string[]
  );

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void>;

  /**
   * Capture full screen screenshot
   * 
   * @param args - Capture arguments
   * @returns Screenshot response with metadata
   */
  async captureFullScreen(args: {
    display?: string;
    format?: ImageFormat;
    quality?: number;
    savePath?: string;
    enablePIIMasking?: boolean;
  }): Promise<ScreenshotResponse>;

  /**
   * Capture specific window
   * 
   * @param args - Capture arguments
   * @returns Screenshot response with window metadata
   */
  async captureWindow(args: {
    windowId?: string;
    windowTitle?: string;
    includeFrame?: boolean;
    format?: ImageFormat;
    quality?: number;
    savePath?: string;
  }): Promise<ScreenshotResponse>;

  /**
   * Capture screen region
   * 
   * @param args - Capture arguments
   * @returns Screenshot response with region metadata
   */
  async captureRegion(args: {
    x: number;
    y: number;
    width: number;
    height: number;
    format?: ImageFormat;
    quality?: number;
    savePath?: string;
  }): Promise<ScreenshotResponse>;

  /**
   * List all displays
   * 
   * @returns Response containing display information
   */
  async listDisplays(): Promise<{
    status: "success" | "error";
    displays?: DisplayInfo[];
    error?: { code: string; message: string; details?: any };
  }>;

  /**
   * List all visible windows
   * 
   * @returns Response containing window information
   */
  async listWindows(): Promise<{
    status: "success" | "error";
    windows?: WindowInfo[];
    error?: { code: string; message: string; details?: any };
  }>;
}
```

### createCaptureEngine

Factory function for creating platform-specific capture engines.

```typescript
/**
 * Create a platform-specific capture engine
 * 
 * @returns Platform-specific capture engine instance
 * @throws Error if the current platform is not supported
 */
function createCaptureEngine(): BaseCaptureEngine;
```

### BaseCaptureEngine

Base interface for capture engines (implemented by platform-specific engines).

```typescript
interface BaseCaptureEngine {
  /**
   * Capture full screen or specific display
   * 
   * @param displayId - Optional display ID
   * @returns Image buffer
   */
  captureScreen(displayId?: string): Promise<Buffer>;

  /**
   * Capture specific window
   * 
   * @param windowId - Window identifier
   * @param includeFrame - Whether to include window frame
   * @returns Image buffer
   */
  captureWindow(windowId: string, includeFrame: boolean): Promise<Buffer>;

  /**
   * Capture screen region
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @returns Image buffer
   */
  captureRegion(
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<Buffer>;

  /**
   * Get all displays
   * 
   * @returns Array of display information
   */
  getDisplays(): Promise<DisplayInfo[]>;

  /**
   * Get all windows
   * 
   * @returns Array of window information
   */
  getWindows(): Promise<WindowInfo[]>;

  /**
   * Get window by ID
   * 
   * @param windowId - Window identifier
   * @returns Window information or undefined
   */
  getWindowById(windowId: string): Promise<WindowInfo | undefined>;

  /**
   * Get window by title pattern
   * 
   * @param titlePattern - Title pattern to match
   * @returns Window information or undefined
   */
  getWindowByTitle(titlePattern: string): Promise<WindowInfo | undefined>;
}
```

### ImageProcessor

Image processing and encoding.

```typescript
class ImageProcessor {
  /**
   * Encode image buffer in specified format
   * 
   * @param buffer - Image buffer
   * @param format - Target format
   * @param quality - Quality setting (1-100)
   * @returns Encoded image buffer
   */
  async encode(
    buffer: Buffer,
    format: ImageFormat,
    quality?: number
  ): Promise<Buffer>;

  /**
   * Get image metadata
   * 
   * @param buffer - Image buffer
   * @returns Image metadata
   */
  async getMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }>;
}
```

### PrivacyManager

PII detection and masking.

```typescript
class PrivacyManager {
  /**
   * Create a new privacy manager
   * 
   * @param excludedWindowPatterns - Window title patterns to exclude
   */
  constructor(excludedWindowPatterns?: string[]);

  /**
   * Mask PII in image
   * 
   * @param imageBuffer - Image buffer
   * @returns Masked image buffer and statistics
   */
  async maskPII(imageBuffer: Buffer): Promise<{
    maskedBuffer: Buffer;
    stats: MaskingStats;
  }>;

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void>;
}
```

### SecurityManager

Security policy enforcement.

```typescript
class SecurityManager {
  /**
   * Create a new security manager
   * 
   * @param policy - Security policy configuration
   */
  constructor(policy?: Partial<SecurityPolicy>);

  /**
   * Validate a file path against security policies
   * 
   * @param filePath - Path to validate
   * @throws PathValidationError if path is invalid
   */
  validatePath(filePath: string): void;

  /**
   * Check rate limit for an agent
   * 
   * @param agentId - Agent identifier
   * @throws RateLimitError if rate limit exceeded
   */
  checkRateLimit(agentId: string): void;

  /**
   * Log an audit entry
   * 
   * @param operation - Operation name
   * @param params - Operation parameters
   * @param result - Operation result
   */
  auditLog(operation: string, params: any, result: any): void;

  /**
   * Load security policy from configuration
   * 
   * @param config - Security policy configuration
   */
  loadPolicy(config: SecurityPolicy): void;

  /**
   * Get current security policy
   * 
   * @returns Current security policy
   */
  getPolicy(): SecurityPolicy;
}
```

### FileOperations

File system operations.

```typescript
class FileOperations {
  /**
   * Save image buffer to file
   * 
   * @param buffer - Image buffer
   * @param filePath - Target file path
   * @returns Absolute path and file size
   */
  async saveToFile(
    buffer: Buffer,
    filePath: string
  ): Promise<{ absolutePath: string; fileSize: number }>;

  /**
   * Encode image buffer as base64
   * 
   * @param buffer - Image buffer
   * @param format - Image format
   * @returns Base64 data and MIME type
   */
  encodeBase64(
    buffer: Buffer,
    format: ImageFormat
  ): { data: string; mimeType: string };
}
```

## Usage Examples

### Basic Server Setup

```typescript
import { MCPScreenshotServer } from '@ai-capabilities-suite/mcp-screenshot';

const server = new MCPScreenshotServer({
  allowedDirectories: ['/home/user/screenshots'],
  maxCapturesPerMinute: 60,
  enableAuditLog: true
});

await server.start();
```

### Direct Tool Usage

```typescript
import { MCPTools } from '@ai-capabilities-suite/mcp-screenshot';

const tools = new MCPTools({
  allowedDirectories: ['/home/user/screenshots'],
  blockedWindowPatterns: ['.*Password.*']
});

// Capture full screen
const result = await tools.captureFullScreen({
  format: 'png',
  savePath: '/home/user/screenshots/desktop.png'
});

// Cleanup
await tools.cleanup();
```

### Error Handling

```typescript
const result = await tools.captureWindow({
  windowTitle: 'NonExistent'
});

if (result.status === 'error') {
  console.error(`Error: ${result.error.code}`);
  console.error(`Message: ${result.error.message}`);
  console.error(`Remediation: ${result.error.remediation}`);
}
```

## See Also

- [README.md](README.md) - Main documentation
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration guide
- [TESTING.md](TESTING.md) - Testing guide
