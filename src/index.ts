/**
 * MCP Screenshot Server
 * Main entry point
 */

// Export types
export * from "./types";

// Export interfaces
export * from "./interfaces";

// Export errors
export * from "./errors";

// Export implementations
export * from "./capture";
export * from "./processing";
export * from "./privacy";
export * from "./security";
export * from "./storage";
export * from "./tools";

// Export server
export { MCPScreenshotServer } from "./server";
