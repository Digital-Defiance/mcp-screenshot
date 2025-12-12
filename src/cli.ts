#!/usr/bin/env node

/**
 * CLI entry point for MCP ACS Screenshot server
 */

import { MCPScreenshotServer } from "./server";
import { SecurityPolicy } from "./types";

// Parse command line arguments for configuration
const args = process.argv.slice(2);
const configPath = args
  .find((arg) => arg.startsWith("--config="))
  ?.split("=")[1];

// Load security policy from config file if provided
let securityPolicy: Partial<SecurityPolicy> | undefined;
let excludedWindowPatterns: string[] | undefined;

if (configPath) {
  try {
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    securityPolicy = config.securityPolicy;
    excludedWindowPatterns = config.excludedWindowPatterns;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    process.exit(1);
  }
}

// Create and start server
const server = new MCPScreenshotServer(securityPolicy, excludedWindowPatterns);

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  console.error(`\nReceived ${signal}, shutting down gracefully...`);
  try {
    await server.stop();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("uncaughtException").catch(() => process.exit(1));
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  shutdown("unhandledRejection").catch(() => process.exit(1));
});

// Start the server
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
