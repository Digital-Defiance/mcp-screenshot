/**
 * Region capture validation and boundary clipping
 */

import { DisplayInfo, RegionInfo } from "../types";
import { InvalidRegionError } from "../errors";

/**
 * Result of region validation with clipping information
 */
export interface ValidatedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  wasClipped: boolean;
  originalRegion: RegionInfo;
  clippedRegion: RegionInfo;
}

/**
 * Region validator for coordinate validation and boundary clipping
 */
export class RegionValidator {
  /**
   * Validate region coordinates and dimensions
   *
   * Requirements:
   * - Coordinates must be non-negative (3.3)
   * - Dimensions must be positive (3.4)
   *
   * @param x X coordinate
   * @param y Y coordinate
   * @param width Width of the region
   * @param height Height of the region
   * @throws InvalidRegionError if validation fails
   */
  validateCoordinates(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Validate coordinates are non-negative (Requirement 3.3)
    if (x < 0 || y < 0) {
      throw new InvalidRegionError("Region coordinates must be non-negative", {
        x,
        y,
        width,
        height,
      });
    }

    // Validate dimensions are positive (Requirement 3.4)
    if (width <= 0 || height <= 0) {
      throw new InvalidRegionError("Region dimensions must be positive", {
        x,
        y,
        width,
        height,
      });
    }
  }

  /**
   * Clip region to display boundaries
   *
   * Handles regions extending beyond screen boundaries by clipping to visible portion.
   * Supports multi-monitor coordinate systems (Requirement 3.5)
   *
   * @param x X coordinate
   * @param y Y coordinate
   * @param width Width of the region
   * @param height Height of the region
   * @param displays Array of display information for multi-monitor setups
   * @returns Validated region with clipping information
   */
  clipToBoundaries(
    x: number,
    y: number,
    width: number,
    height: number,
    displays: DisplayInfo[]
  ): ValidatedRegion {
    // First validate the input coordinates
    this.validateCoordinates(x, y, width, height);

    const originalRegion: RegionInfo = { x, y, width, height };

    // Calculate the virtual desktop bounds from all displays
    const virtualBounds = this.calculateVirtualBounds(displays);

    // Calculate the requested region bounds
    const requestedRight = x + width;
    const requestedBottom = y + height;

    // Clip to virtual desktop boundaries
    const clippedX = Math.max(virtualBounds.minX, x);
    const clippedY = Math.max(virtualBounds.minY, y);
    const clippedRight = Math.min(virtualBounds.maxX, requestedRight);
    const clippedBottom = Math.min(virtualBounds.maxY, requestedBottom);

    // Calculate clipped dimensions
    const clippedWidth = Math.max(0, clippedRight - clippedX);
    const clippedHeight = Math.max(0, clippedBottom - clippedY);

    // Check if region was completely outside bounds
    if (clippedWidth === 0 || clippedHeight === 0) {
      throw new InvalidRegionError(
        "Region is completely outside display boundaries",
        {
          originalRegion,
          virtualBounds,
          displays: displays.map((d) => ({
            id: d.id,
            position: d.position,
            resolution: d.resolution,
          })),
        }
      );
    }

    const clippedRegion: RegionInfo = {
      x: clippedX,
      y: clippedY,
      width: clippedWidth,
      height: clippedHeight,
    };

    const wasClipped =
      clippedX !== x ||
      clippedY !== y ||
      clippedWidth !== width ||
      clippedHeight !== height;

    return {
      x: clippedX,
      y: clippedY,
      width: clippedWidth,
      height: clippedHeight,
      wasClipped,
      originalRegion,
      clippedRegion,
    };
  }

  /**
   * Calculate virtual desktop bounds from all displays
   * Handles multi-monitor coordinate systems (Requirement 3.5)
   *
   * @param displays Array of display information
   * @returns Virtual bounds containing all displays
   */
  private calculateVirtualBounds(displays: DisplayInfo[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    if (displays.length === 0) {
      // Fallback to default bounds if no displays
      return { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const display of displays) {
      const displayLeft = display.position.x;
      const displayTop = display.position.y;
      const displayRight = displayLeft + display.resolution.width;
      const displayBottom = displayTop + display.resolution.height;

      minX = Math.min(minX, displayLeft);
      minY = Math.min(minY, displayTop);
      maxX = Math.max(maxX, displayRight);
      maxY = Math.max(maxY, displayBottom);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Check if a region is within display boundaries
   *
   * @param x X coordinate
   * @param y Y coordinate
   * @param width Width of the region
   * @param height Height of the region
   * @param displays Array of display information
   * @returns True if region is completely within bounds
   */
  isWithinBounds(
    x: number,
    y: number,
    width: number,
    height: number,
    displays: DisplayInfo[]
  ): boolean {
    const virtualBounds = this.calculateVirtualBounds(displays);
    const right = x + width;
    const bottom = y + height;

    return (
      x >= virtualBounds.minX &&
      y >= virtualBounds.minY &&
      right <= virtualBounds.maxX &&
      bottom <= virtualBounds.maxY
    );
  }
}
