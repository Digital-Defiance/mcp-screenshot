/**
 * File operations for saving and encoding screenshots
 */

import * as fs from "fs/promises";
import * as path from "path";
import { ImageFormat } from "../types";
import { FileSystemError, PermissionDeniedError } from "../errors";

/**
 * File operations interface
 */
export interface IFileOperations {
  /**
   * Save image buffer to file system
   * @param buffer Image buffer to save
   * @param filePath Destination file path
   * @returns Absolute path and file size
   */
  saveToFile(
    buffer: Buffer,
    filePath: string
  ): Promise<{ absolutePath: string; fileSize: number }>;

  /**
   * Encode image buffer as base64 string
   * @param buffer Image buffer to encode
   * @param format Image format for MIME type
   * @returns Base64 encoded string and MIME type
   */
  encodeBase64(
    buffer: Buffer,
    format: ImageFormat
  ): { data: string; mimeType: string };
}

/**
 * File operations implementation
 */
export class FileOperations implements IFileOperations {
  /**
   * Save image buffer to file system
   * Creates parent directories if they don't exist with secure permissions (700)
   *
   * @param buffer Image buffer to save
   * @param filePath Destination file path
   * @returns Absolute path and file size
   */
  async saveToFile(
    buffer: Buffer,
    filePath: string
  ): Promise<{ absolutePath: string; fileSize: number }> {
    try {
      // Resolve to absolute path
      const absolutePath = path.resolve(filePath);

      // Get directory path
      const directory = path.dirname(absolutePath);

      // Create directory structure with secure permissions (700)
      // recursive: true creates parent directories as needed
      // mode: 0o700 sets permissions to rwx------ (owner only)
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });

      // Write the file
      await fs.writeFile(absolutePath, buffer);

      // Get file size
      const stats = await fs.stat(absolutePath);
      const fileSize = stats.size;

      return {
        absolutePath,
        fileSize,
      };
    } catch (error) {
      // Handle specific file system errors
      if (error instanceof Error) {
        const errorCode = (error as NodeJS.ErrnoException).code;

        if (errorCode === "EACCES" || errorCode === "EPERM") {
          throw new PermissionDeniedError(
            `Permission denied when saving to ${filePath}: ${error.message}`,
            { filePath, originalError: error }
          );
        }

        if (errorCode === "ENOENT") {
          throw new FileSystemError(`Directory not found: ${error.message}`, {
            filePath,
            originalError: error,
          });
        }

        if (errorCode === "ENOSPC") {
          throw new FileSystemError(
            `No space left on device: ${error.message}`,
            { filePath, originalError: error }
          );
        }

        if (errorCode === "EROFS") {
          throw new FileSystemError(`Read-only file system: ${error.message}`, {
            filePath,
            originalError: error,
          });
        }
      }

      // Generic file system error
      throw new FileSystemError(
        `Failed to save file to ${filePath}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        { filePath, originalError: error }
      );
    }
  }

  /**
   * Encode image buffer as base64 string
   * Handles large images efficiently by using Buffer's built-in base64 encoding
   *
   * @param buffer Image buffer to encode
   * @param format Image format for MIME type
   * @returns Base64 encoded string and MIME type
   */
  encodeBase64(
    buffer: Buffer,
    format: ImageFormat
  ): { data: string; mimeType: string } {
    // Convert buffer to base64 string
    // Buffer.toString('base64') is efficient for large buffers
    const data = buffer.toString("base64");

    // Determine MIME type based on format
    const mimeType = this.getMimeType(format);

    return {
      data,
      mimeType,
    };
  }

  /**
   * Get MIME type for image format
   *
   * @param format Image format
   * @returns MIME type string
   */
  private getMimeType(format: ImageFormat): string {
    const mimeTypes: Record<ImageFormat, string> = {
      png: "image/png",
      jpeg: "image/jpeg",
      webp: "image/webp",
      bmp: "image/bmp",
    };

    return mimeTypes[format];
  }
}
