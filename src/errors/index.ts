/**
 * Custom error classes for MCP Screenshot server
 */

/**
 * Error response structure
 */
export interface ErrorResponse {
  status: "error";
  error: {
    code: string;
    message: string;
    details?: any;
    remediation?: string;
  };
}

/**
 * Base screenshot error
 */
export class ScreenshotError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "ScreenshotError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Security-related error
 */
export class SecurityError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.SECURITY_ERROR, details);
    this.name = "SecurityError";
  }
}

/**
 * Path validation error
 */
export class PathValidationError extends SecurityError {
  constructor(message: string, details?: any) {
    super(message, details);
    this.code = ErrorCodes.INVALID_PATH;
    this.name = "PathValidationError";
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends SecurityError {
  constructor(message: string, details?: any) {
    super(message, details);
    this.code = ErrorCodes.RATE_LIMIT_EXCEEDED;
    this.name = "RateLimitError";
  }
}

/**
 * Window not found error
 */
export class WindowNotFoundError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.WINDOW_NOT_FOUND, details);
    this.name = "WindowNotFoundError";
  }
}

/**
 * Display not found error
 */
export class DisplayNotFoundError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.DISPLAY_NOT_FOUND, details);
    this.name = "DisplayNotFoundError";
  }
}

/**
 * Capture failed error
 */
export class CaptureFailedError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.CAPTURE_FAILED, details);
    this.name = "CaptureFailedError";
  }
}

/**
 * Unsupported format error
 */
export class UnsupportedFormatError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.UNSUPPORTED_FORMAT, details);
    this.name = "UnsupportedFormatError";
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.PERMISSION_DENIED, details);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Encoding failed error
 */
export class EncodingFailedError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.ENCODING_FAILED, details);
    this.name = "EncodingFailedError";
  }
}

/**
 * File system error
 */
export class FileSystemError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.FILE_SYSTEM_ERROR, details);
    this.name = "FileSystemError";
  }
}

/**
 * Invalid region error
 */
export class InvalidRegionError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.INVALID_REGION, details);
    this.name = "InvalidRegionError";
  }
}

/**
 * Out of memory error
 */
export class OutOfMemoryError extends ScreenshotError {
  constructor(message: string, details?: any) {
    super(message, ErrorCodes.OUT_OF_MEMORY, details);
    this.name = "OutOfMemoryError";
  }
}

/**
 * Error codes
 */
export const ErrorCodes = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  INVALID_PATH: "INVALID_PATH",
  WINDOW_NOT_FOUND: "WINDOW_NOT_FOUND",
  DISPLAY_NOT_FOUND: "DISPLAY_NOT_FOUND",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  CAPTURE_FAILED: "CAPTURE_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  SECURITY_ERROR: "SECURITY_ERROR",
  INVALID_REGION: "INVALID_REGION",
  OUT_OF_MEMORY: "OUT_OF_MEMORY",
  ENCODING_FAILED: "ENCODING_FAILED",
  FILE_SYSTEM_ERROR: "FILE_SYSTEM_ERROR",
} as const;

/**
 * Error remediation messages
 */
export const ErrorRemediations: Record<string, string> = {
  [ErrorCodes.PERMISSION_DENIED]:
    "Ensure the application has necessary permissions to capture screenshots. On macOS, grant Screen Recording permission in System Preferences > Security & Privacy.",
  [ErrorCodes.INVALID_PATH]:
    "Provide a valid file path within the allowed directories. Check the security policy configuration.",
  [ErrorCodes.WINDOW_NOT_FOUND]:
    "Verify the window exists and is visible. Use screenshot_list_windows to see available windows.",
  [ErrorCodes.DISPLAY_NOT_FOUND]:
    "Verify the display ID is correct. Use screenshot_list_displays to see available displays.",
  [ErrorCodes.UNSUPPORTED_FORMAT]:
    "Use one of the supported formats: png, jpeg, webp, or bmp.",
  [ErrorCodes.CAPTURE_FAILED]:
    "Check system permissions and ensure the target is accessible. Try again or contact support if the issue persists.",
  [ErrorCodes.RATE_LIMIT_EXCEEDED]:
    "Wait before making additional capture requests. The rate limit will reset after the configured time window.",
  [ErrorCodes.SECURITY_ERROR]:
    "Review the security policy configuration and ensure the operation is allowed.",
  [ErrorCodes.INVALID_REGION]:
    "Ensure region coordinates are non-negative and dimensions are positive. Check that the region is within screen bounds.",
  [ErrorCodes.OUT_OF_MEMORY]:
    "Reduce the capture size or quality settings. Close other applications to free up memory.",
  [ErrorCodes.ENCODING_FAILED]:
    "Try a different image format or reduce the quality setting. Ensure sufficient disk space is available.",
  [ErrorCodes.FILE_SYSTEM_ERROR]:
    "Check file permissions and ensure the directory exists. Verify sufficient disk space is available.",
};

/**
 * Format error response with structured information
 */
export function formatErrorResponse(error: unknown): ErrorResponse {
  if (error instanceof ScreenshotError) {
    return {
      status: "error",
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        remediation: ErrorRemediations[error.code],
      },
    };
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes("EACCES") || error.message.includes("EPERM")) {
      return {
        status: "error",
        error: {
          code: ErrorCodes.PERMISSION_DENIED,
          message: `Permission denied: ${error.message}`,
          remediation: ErrorRemediations[ErrorCodes.PERMISSION_DENIED],
        },
      };
    }

    if (error.message.includes("ENOENT")) {
      return {
        status: "error",
        error: {
          code: ErrorCodes.FILE_SYSTEM_ERROR,
          message: `File or directory not found: ${error.message}`,
          remediation: ErrorRemediations[ErrorCodes.FILE_SYSTEM_ERROR],
        },
      };
    }

    if (error.message.includes("ENOSPC")) {
      return {
        status: "error",
        error: {
          code: ErrorCodes.FILE_SYSTEM_ERROR,
          message: `No space left on device: ${error.message}`,
          remediation: ErrorRemediations[ErrorCodes.FILE_SYSTEM_ERROR],
        },
      };
    }

    if (
      error.message.includes("out of memory") ||
      error.message.includes("OOM")
    ) {
      return {
        status: "error",
        error: {
          code: ErrorCodes.OUT_OF_MEMORY,
          message: error.message,
          remediation: ErrorRemediations[ErrorCodes.OUT_OF_MEMORY],
        },
      };
    }

    // Generic error
    return {
      status: "error",
      error: {
        code: ErrorCodes.CAPTURE_FAILED,
        message: error.message,
        remediation: ErrorRemediations[ErrorCodes.CAPTURE_FAILED],
      },
    };
  }

  // Unknown error type
  return {
    status: "error",
    error: {
      code: ErrorCodes.CAPTURE_FAILED,
      message: "An unknown error occurred",
      remediation: ErrorRemediations[ErrorCodes.CAPTURE_FAILED],
    },
  };
}

/**
 * Create a structured error response for tool handlers
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any
): ErrorResponse {
  return {
    status: "error",
    error: {
      code,
      message,
      details,
      remediation: ErrorRemediations[code],
    },
  };
}
