/**
 * MCP tool implementations for screenshot capture
 *
 * This module implements the five MCP tools exposed by the screenshot server:
 * - screenshot_capture_full: Capture full screen or specific display
 * - screenshot_capture_window: Capture specific application window
 * - screenshot_capture_region: Capture rectangular screen region
 * - screenshot_list_displays: List all connected displays
 * - screenshot_list_windows: List all visible windows
 *
 * @module tools
 */

import { z } from "zod";
import { createCaptureEngine } from "../capture";
import { ImageProcessor } from "../processing";
import { PrivacyManager } from "../privacy";
import { SecurityManager } from "../security";
import { FileOperations } from "../storage";
import {
  ImageFormat,
  ScreenshotResponse,
  ScreenshotMetadata,
  SecurityPolicy,
} from "../types";
import {
  ScreenshotError,
  WindowNotFoundError,
  DisplayNotFoundError,
  formatErrorResponse,
  EncodingFailedError,
  FileSystemError,
  InvalidRegionError,
} from "../errors";

/**
 * MCP Tools class that implements all screenshot tools
 *
 * This class provides the implementation for all five MCP screenshot tools,
 * handling capture operations, security enforcement, PII masking, and file operations.
 *
 * @example
 * ```typescript
 * import { MCPTools } from '@ai-capabilities-suite/mcp-screenshot';
 *
 * const tools = new MCPTools({
 *   allowedDirectories: ['/home/user/screenshots'],
 *   maxCapturesPerMinute: 60,
 *   enableAuditLog: true
 * });
 *
 * const result = await tools.captureFullScreen({
 *   format: 'png',
 *   savePath: '/home/user/screenshots/test.png'
 * });
 * ```
 */
export class MCPTools {
  private captureEngine = createCaptureEngine();
  private imageProcessor = new ImageProcessor();
  private privacyManager: PrivacyManager;
  private securityManager: SecurityManager;
  private fileOperations = new FileOperations();

  /**
   * Create a new MCPTools instance
   *
   * @param {Partial<SecurityPolicy>} securityPolicy - Optional security policy configuration
   * @param {string[]} excludedWindowPatterns - Optional window title patterns to exclude from captures
   *
   * @example
   * ```typescript
   * const tools = new MCPTools({
   *   allowedDirectories: ['/home/user/screenshots'],
   *   blockedWindowPatterns: ['.*Password.*'],
   *   maxCapturesPerMinute: 60,
   *   enableAuditLog: true
   * }, ['.*1Password.*', '.*LastPass.*']);
   * ```
   */
  constructor(
    securityPolicy?: Partial<SecurityPolicy>,
    excludedWindowPatterns?: string[]
  ) {
    this.securityManager = new SecurityManager(securityPolicy);
    this.privacyManager = new PrivacyManager(excludedWindowPatterns);
  }

  /**
   * Cleanup resources
   *
   * Releases resources used by the privacy manager (e.g., Tesseract worker).
   * Should be called when the tools instance is no longer needed.
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * const tools = new MCPTools();
   * // ... use tools ...
   * await tools.cleanup();
   * ```
   */
  async cleanup(): Promise<void> {
    await this.privacyManager.cleanup();
  }

  /**
   * Tool: screenshot_capture_full
   *
   * Capture full screen screenshot with optional PII masking and format selection.
   *
   * @param {Object} args - Capture arguments
   * @param {string} [args.display] - Display ID to capture (defaults to primary display)
   * @param {ImageFormat} [args.format='png'] - Image format (png, jpeg, webp, bmp)
   * @param {number} [args.quality=90] - Compression quality for lossy formats (1-100)
   * @param {string} [args.savePath] - File path to save screenshot (returns base64 if not provided)
   * @param {boolean} [args.enablePIIMasking=false] - Enable PII detection and masking
   *
   * @returns {Promise<ScreenshotResponse>} Screenshot response with metadata
   *
   * @throws {DisplayNotFoundError} If specified display does not exist
   * @throws {PathValidationError} If save path is outside allowed directories
   * @throws {RateLimitError} If rate limit is exceeded
   * @throws {CaptureFailedError} If screenshot capture fails
   *
   * @example
   * ```typescript
   * // Capture primary display and save to file
   * const result = await tools.captureFullScreen({
   *   format: 'png',
   *   savePath: '/home/user/screenshots/desktop.png'
   * });
   *
   * // Capture specific display with PII masking
   * const result = await tools.captureFullScreen({
   *   display: '1',
   *   format: 'jpeg',
   *   quality: 85,
   *   enablePIIMasking: true
   * });
   * ```
   */
  async captureFullScreen(args: {
    display?: string;
    format?: ImageFormat;
    quality?: number;
    savePath?: string;
    enablePIIMasking?: boolean;
  }): Promise<ScreenshotResponse> {
    try {
      // Check rate limit (using a default agent ID for now)
      this.securityManager.checkRateLimit("default");

      // Validate save path if provided
      if (args.savePath) {
        this.securityManager.validatePath(args.savePath);
      }

      // Set defaults
      const format = args.format || "png";
      const quality = args.quality;
      const enablePIIMasking = args.enablePIIMasking || false;

      // Capture screen
      let buffer = await this.captureEngine.captureScreen(args.display);

      // Get display info for metadata
      const displays = await this.captureEngine.getDisplays();
      const display = args.display
        ? displays.find((d) => d.id === args.display)
        : displays.find((d) => d.isPrimary);

      if (args.display && !display) {
        throw new DisplayNotFoundError(`Display not found: ${args.display}`, {
          displayId: args.display,
        });
      }

      // Apply PII masking if enabled
      let maskingStats;
      if (enablePIIMasking) {
        const result = await this.privacyManager.maskPII(buffer);
        buffer = result.maskedBuffer;
        maskingStats = result.stats;
      }

      // Encode in requested format
      const encoded = await this.imageProcessor.encode(buffer, format, quality);

      // Get metadata
      const imageMetadata = await this.imageProcessor.getMetadata(encoded);

      const metadata: ScreenshotMetadata = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format,
        fileSize: imageMetadata.size,
        timestamp: new Date().toISOString(),
        display,
        piiMasking: maskingStats,
      };

      // Save or return base64
      let response: ScreenshotResponse;
      if (args.savePath) {
        const { absolutePath, fileSize } = await this.fileOperations.saveToFile(
          encoded,
          args.savePath
        );
        response = {
          status: "success",
          filePath: absolutePath,
          metadata: {
            ...metadata,
            fileSize,
          },
        };
      } else {
        const { data, mimeType } = this.fileOperations.encodeBase64(
          encoded,
          format
        );
        response = {
          status: "success",
          data,
          mimeType,
          metadata,
        };
      }

      // Audit log
      this.securityManager.auditLog("screenshot_capture_full", args, response);

      return response;
    } catch (error) {
      const errorResponse = formatErrorResponse(error);

      // Audit log error
      this.securityManager.auditLog(
        "screenshot_capture_full",
        args,
        errorResponse
      );

      return errorResponse;
    }
  }

  /**
   * Tool: screenshot_capture_window
   *
   * Capture specific application window by ID or title pattern.
   *
   * @param {Object} args - Capture arguments
   * @param {string} [args.windowId] - Window identifier (use windowId or windowTitle)
   * @param {string} [args.windowTitle] - Window title pattern to match (use windowId or windowTitle)
   * @param {boolean} [args.includeFrame=false] - Include window frame and title bar
   * @param {ImageFormat} [args.format='png'] - Image format (png, jpeg, webp, bmp)
   * @param {number} [args.quality=90] - Compression quality for lossy formats (1-100)
   * @param {string} [args.savePath] - File path to save screenshot (returns base64 if not provided)
   *
   * @returns {Promise<ScreenshotResponse>} Screenshot response with window metadata
   *
   * @throws {WindowNotFoundError} If specified window does not exist or is minimized
   * @throws {PathValidationError} If save path is outside allowed directories
   * @throws {RateLimitError} If rate limit is exceeded
   * @throws {CaptureFailedError} If screenshot capture fails
   *
   * @example
   * ```typescript
   * // Capture window by ID
   * const result = await tools.captureWindow({
   *   windowId: '12345',
   *   format: 'png'
   * });
   *
   * // Capture window by title pattern with frame
   * const result = await tools.captureWindow({
   *   windowTitle: 'Chrome',
   *   includeFrame: true,
   *   format: 'jpeg',
   *   quality: 85
   * });
   * ```
   *
   * @remarks
   * - Either windowId or windowTitle must be provided
   * - Window title matching is case-insensitive and supports partial matches
   * - Minimized windows cannot be captured
   */
  async captureWindow(args: {
    windowId?: string;
    windowTitle?: string;
    includeFrame?: boolean;
    format?: ImageFormat;
    quality?: number;
    savePath?: string;
  }): Promise<ScreenshotResponse> {
    try {
      // Check rate limit
      this.securityManager.checkRateLimit("default");

      // Validate save path if provided
      if (args.savePath) {
        this.securityManager.validatePath(args.savePath);
      }

      // Set defaults
      const format = args.format || "png";
      const quality = args.quality;
      const includeFrame = args.includeFrame || false;

      // Find window
      let window;
      if (args.windowId) {
        window = await this.captureEngine.getWindowById(args.windowId);
      } else if (args.windowTitle) {
        window = await this.captureEngine.getWindowByTitle(args.windowTitle);
      } else {
        throw new WindowNotFoundError(
          "Either windowId or windowTitle must be provided"
        );
      }

      if (!window) {
        throw new WindowNotFoundError(
          args.windowId
            ? `Window not found: ${args.windowId}`
            : `Window not found with title: ${args.windowTitle}`,
          {
            windowId: args.windowId,
            windowTitle: args.windowTitle,
          }
        );
      }

      if (window.isMinimized) {
        throw new WindowNotFoundError("Cannot capture minimized window", {
          windowId: window.id,
          windowTitle: window.title,
        });
      }

      // Capture window
      let buffer = await this.captureEngine.captureWindow(
        window.id,
        includeFrame
      );

      // Encode in requested format
      const encoded = await this.imageProcessor.encode(buffer, format, quality);

      // Get metadata
      const imageMetadata = await this.imageProcessor.getMetadata(encoded);

      const metadata: ScreenshotMetadata = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format,
        fileSize: imageMetadata.size,
        timestamp: new Date().toISOString(),
        window: {
          id: window.id,
          title: window.title,
          processName: window.processName,
          pid: window.pid,
          bounds: window.bounds,
          isMinimized: window.isMinimized,
        },
      };

      // Save or return base64
      let response: ScreenshotResponse;
      if (args.savePath) {
        const { absolutePath, fileSize } = await this.fileOperations.saveToFile(
          encoded,
          args.savePath
        );
        response = {
          status: "success",
          filePath: absolutePath,
          metadata: {
            ...metadata,
            fileSize,
          },
        };
      } else {
        const { data, mimeType } = this.fileOperations.encodeBase64(
          encoded,
          format
        );
        response = {
          status: "success",
          data,
          mimeType,
          metadata,
        };
      }

      // Audit log
      this.securityManager.auditLog(
        "screenshot_capture_window",
        args,
        response
      );

      return response;
    } catch (error) {
      const errorResponse = formatErrorResponse(error);

      // Audit log error
      this.securityManager.auditLog(
        "screenshot_capture_window",
        args,
        errorResponse
      );

      return errorResponse;
    }
  }

  /**
   * Tool: screenshot_capture_region
   *
   * Capture specific rectangular region of the screen by coordinates.
   *
   * @param {Object} args - Capture arguments
   * @param {number} args.x - X coordinate of top-left corner (must be non-negative)
   * @param {number} args.y - Y coordinate of top-left corner (must be non-negative)
   * @param {number} args.width - Width of region in pixels (must be positive)
   * @param {number} args.height - Height of region in pixels (must be positive)
   * @param {ImageFormat} [args.format='png'] - Image format (png, jpeg, webp, bmp)
   * @param {number} [args.quality=90] - Compression quality for lossy formats (1-100)
   * @param {string} [args.savePath] - File path to save screenshot (returns base64 if not provided)
   *
   * @returns {Promise<ScreenshotResponse>} Screenshot response with region metadata
   *
   * @throws {InvalidRegionError} If coordinates are negative or dimensions are non-positive
   * @throws {PathValidationError} If save path is outside allowed directories
   * @throws {RateLimitError} If rate limit is exceeded
   * @throws {CaptureFailedError} If screenshot capture fails
   *
   * @example
   * ```typescript
   * // Capture 800x600 region starting at (100, 100)
   * const result = await tools.captureRegion({
   *   x: 100,
   *   y: 100,
   *   width: 800,
   *   height: 600,
   *   format: 'png'
   * });
   * ```
   *
   * @remarks
   * - Coordinates are relative to the virtual desktop coordinate system
   * - If region extends beyond screen boundaries, only the visible portion is captured
   * - Actual captured dimensions are reported in metadata (may differ if clipped)
   */
  async captureRegion(args: {
    x: number;
    y: number;
    width: number;
    height: number;
    format?: ImageFormat;
    quality?: number;
    savePath?: string;
  }): Promise<ScreenshotResponse> {
    try {
      // Check rate limit
      this.securityManager.checkRateLimit("default");

      // Validate save path if provided
      if (args.savePath) {
        this.securityManager.validatePath(args.savePath);
      }

      // Set defaults
      const format = args.format || "png";
      const quality = args.quality;

      // Validate dimensions
      if (args.x < 0 || args.y < 0) {
        throw new InvalidRegionError(
          "Region coordinates must be non-negative",
          { x: args.x, y: args.y }
        );
      }

      if (args.width <= 0 || args.height <= 0) {
        throw new InvalidRegionError("Region dimensions must be positive", {
          width: args.width,
          height: args.height,
        });
      }

      // Capture region (validation and clipping handled by captureEngine)
      let buffer = await this.captureEngine.captureRegion(
        args.x,
        args.y,
        args.width,
        args.height
      );

      // Encode in requested format
      const encoded = await this.imageProcessor.encode(buffer, format, quality);

      // Get metadata
      const imageMetadata = await this.imageProcessor.getMetadata(encoded);

      const metadata: ScreenshotMetadata = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format,
        fileSize: imageMetadata.size,
        timestamp: new Date().toISOString(),
        region: {
          x: args.x,
          y: args.y,
          width: imageMetadata.width, // Actual captured width (may be clipped)
          height: imageMetadata.height, // Actual captured height (may be clipped)
        },
      };

      // Save or return base64
      let response: ScreenshotResponse;
      if (args.savePath) {
        const { absolutePath, fileSize } = await this.fileOperations.saveToFile(
          encoded,
          args.savePath
        );
        response = {
          status: "success",
          filePath: absolutePath,
          metadata: {
            ...metadata,
            fileSize,
          },
        };
      } else {
        const { data, mimeType } = this.fileOperations.encodeBase64(
          encoded,
          format
        );
        response = {
          status: "success",
          data,
          mimeType,
          metadata,
        };
      }

      // Audit log
      this.securityManager.auditLog(
        "screenshot_capture_region",
        args,
        response
      );

      return response;
    } catch (error) {
      const errorResponse = formatErrorResponse(error);

      // Audit log error
      this.securityManager.auditLog(
        "screenshot_capture_region",
        args,
        errorResponse
      );

      return errorResponse;
    }
  }

  /**
   * Tool: screenshot_list_displays
   *
   * List all connected displays with resolution and position information.
   *
   * @returns {Promise<Object>} Response containing display information
   * @returns {string} return.status - Operation status ('success' or 'error')
   * @returns {Array} [return.displays] - Array of display information objects
   * @returns {Object} [return.error] - Error information if operation failed
   *
   * @example
   * ```typescript
   * const result = await tools.listDisplays();
   * if (result.status === 'success') {
   *   result.displays.forEach(display => {
   *     console.log(`${display.name}: ${display.resolution.width}x${display.resolution.height}`);
   *   });
   * }
   * ```
   *
   * @remarks
   * - Display IDs can be used with captureFullScreen to capture specific displays
   * - Position coordinates are relative to the virtual desktop coordinate system
   * - Primary display is indicated by isPrimary flag
   */
  async listDisplays(): Promise<{
    status: "success" | "error";
    displays?: Array<{
      id: string;
      name: string;
      resolution: { width: number; height: number };
      position: { x: number; y: number };
      isPrimary: boolean;
    }>;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  }> {
    try {
      const displays = await this.captureEngine.getDisplays();

      const response = {
        status: "success" as const,
        displays: displays.map((d) => ({
          id: d.id,
          name: d.name,
          resolution: d.resolution,
          position: d.position,
          isPrimary: d.isPrimary,
        })),
      };

      // Audit log
      this.securityManager.auditLog("screenshot_list_displays", {}, response);

      return response;
    } catch (error) {
      const errorResponse = formatErrorResponse(error);

      // Audit log error
      this.securityManager.auditLog(
        "screenshot_list_displays",
        {},
        errorResponse
      );

      return errorResponse;
    }
  }

  /**
   * Tool: screenshot_list_windows
   *
   * List all visible windows with title, process, and position information.
   *
   * @returns {Promise<Object>} Response containing window information
   * @returns {string} return.status - Operation status ('success' or 'error')
   * @returns {Array} [return.windows] - Array of window information objects
   * @returns {Object} [return.error] - Error information if operation failed
   *
   * @example
   * ```typescript
   * const result = await tools.listWindows();
   * if (result.status === 'success') {
   *   result.windows.forEach(window => {
   *     console.log(`${window.title} (${window.processName})`);
   *   });
   * }
   * ```
   *
   * @remarks
   * - Window IDs can be used with captureWindow to capture specific windows
   * - Minimized windows are included but cannot be captured
   * - Window titles may be truncated by the operating system
   */
  async listWindows(): Promise<{
    status: "success" | "error";
    windows?: Array<{
      id: string;
      title: string;
      processName: string;
      pid: number;
      bounds: { x: number; y: number; width: number; height: number };
      isMinimized: boolean;
    }>;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  }> {
    try {
      const windows = await this.captureEngine.getWindows();

      const response = {
        status: "success" as const,
        windows: windows.map((w) => ({
          id: w.id,
          title: w.title,
          processName: w.processName,
          pid: w.pid,
          bounds: w.bounds,
          isMinimized: w.isMinimized,
        })),
      };

      // Audit log
      this.securityManager.auditLog("screenshot_list_windows", {}, response);

      return response;
    } catch (error) {
      const errorResponse = formatErrorResponse(error);

      // Audit log error
      this.securityManager.auditLog(
        "screenshot_list_windows",
        {},
        errorResponse
      );

      return errorResponse;
    }
  }
}
