/**
 * Type definitions for screenshot-desktop
 */

declare module "screenshot-desktop" {
  interface ScreenshotOptions {
    format?: string;
    screen?: number;
  }

  function screenshot(options?: ScreenshotOptions): Promise<Buffer>;

  export = screenshot;
}
