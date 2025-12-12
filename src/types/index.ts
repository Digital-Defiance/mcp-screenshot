/**
 * Core type definitions for MCP ACS Screenshot server
 */

/**
 * Supported image formats
 */
export type ImageFormat = "png" | "jpeg" | "webp" | "bmp";

/**
 * Display information
 */
export interface DisplayInfo {
  id: string;
  name: string;
  resolution: { width: number; height: number };
  position: { x: number; y: number };
  isPrimary: boolean;
}

/**
 * Window information
 */
export interface WindowInfo {
  id: string;
  title: string;
  processName: string;
  pid: number;
  bounds: { x: number; y: number; width: number; height: number };
  isMinimized: boolean;
}

/**
 * Region information
 */
export interface RegionInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * PII masking statistics
 */
export interface MaskingStats {
  emailsRedacted: number;
  phonesRedacted: number;
  creditCardsRedacted: number;
  customPatternsRedacted: number;
}

/**
 * Screenshot metadata
 */
export interface ScreenshotMetadata {
  width: number;
  height: number;
  format: ImageFormat;
  fileSize: number;
  timestamp: string;
  display?: DisplayInfo;
  window?: WindowInfo;
  region?: RegionInfo;
  piiMasking?: MaskingStats;
}

/**
 * Screenshot capture options
 */
export interface CaptureOptions {
  format?: ImageFormat;
  quality?: number;
  savePath?: string;
  enablePIIMasking?: boolean;
}

/**
 * Window capture options
 */
export interface WindowCaptureOptions {
  windowId?: string;
  windowTitle?: string;
  includeFrame?: boolean;
  format?: ImageFormat;
  quality?: number;
  savePath?: string;
}

/**
 * Region capture options
 */
export interface RegionCaptureOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  format?: ImageFormat;
  quality?: number;
  savePath?: string;
}

/**
 * Screenshot response
 */
export interface ScreenshotResponse {
  status: "success" | "error";
  data?: string; // base64 encoded image
  filePath?: string;
  mimeType?: string;
  metadata?: ScreenshotMetadata;
  error?: {
    code: string;
    message: string;
    details?: any;
    remediation?: string;
  };
}

/**
 * Security policy configuration
 */
export interface SecurityPolicy {
  allowedDirectories: string[];
  blockedWindowPatterns: string[];
  maxCapturesPerMinute: number;
  enableAuditLog: boolean;
}
