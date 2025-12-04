/**
 * MCP Screenshot Server
 * Main server implementation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MCPTools } from "./tools";
import { SecurityPolicy } from "./types";

/**
 * MCP Screenshot Server class
 */
export class MCPScreenshotServer {
  private server: Server;
  private mcpTools: MCPTools;
  private isRunning = false;

  constructor(
    securityPolicy?: Partial<SecurityPolicy>,
    excludedWindowPatterns?: string[]
  ) {
    // Initialize MCP server with name and version
    this.server = new Server(
      {
        name: "mcp-screenshot",
        version: "1.0.2",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tools
    this.mcpTools = new MCPTools(securityPolicy, excludedWindowPatterns);

    // Set up request handlers
    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers
   */
  private setupHandlers(): void {
    // Handle tools/list request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolSchemas(),
    }));

    // Handle tools/call request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.handleToolCall(name, args || {});
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "error",
                  error: {
                    code: "TOOL_EXECUTION_ERROR",
                    message:
                      error instanceof Error ? error.message : "Unknown error",
                  },
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Get tool schemas for tools/list
   */
  private getToolSchemas() {
    return [
      {
        name: "screenshot_capture_full",
        description:
          "Capture full screen screenshot with optional PII masking and format selection",
        inputSchema: {
          type: "object",
          properties: {
            display: {
              type: "string",
              description: "Display ID (optional, defaults to primary display)",
            },
            format: {
              type: "string",
              enum: ["png", "jpeg", "webp", "bmp"],
              description: "Image format (default: png)",
            },
            quality: {
              type: "number",
              minimum: 1,
              maximum: 100,
              description:
                "Compression quality for lossy formats (1-100, default: 90)",
            },
            savePath: {
              type: "string",
              description:
                "File path to save screenshot (optional, returns base64 if not provided)",
            },
            enablePIIMasking: {
              type: "boolean",
              description: "Enable PII detection and masking (default: false)",
            },
          },
        },
      },
      {
        name: "screenshot_capture_window",
        description:
          "Capture specific application window by ID or title pattern",
        inputSchema: {
          type: "object",
          properties: {
            windowId: {
              type: "string",
              description: "Window identifier (use windowId or windowTitle)",
            },
            windowTitle: {
              type: "string",
              description:
                "Window title pattern to match (use windowId or windowTitle)",
            },
            includeFrame: {
              type: "boolean",
              description:
                "Include window frame and title bar (default: false)",
            },
            format: {
              type: "string",
              enum: ["png", "jpeg", "webp", "bmp"],
              description: "Image format (default: png)",
            },
            quality: {
              type: "number",
              minimum: 1,
              maximum: 100,
              description:
                "Compression quality for lossy formats (1-100, default: 90)",
            },
            savePath: {
              type: "string",
              description:
                "File path to save screenshot (optional, returns base64 if not provided)",
            },
          },
        },
      },
      {
        name: "screenshot_capture_region",
        description:
          "Capture specific rectangular region of the screen by coordinates",
        inputSchema: {
          type: "object",
          properties: {
            x: {
              type: "number",
              minimum: 0,
              description: "X coordinate of top-left corner",
            },
            y: {
              type: "number",
              minimum: 0,
              description: "Y coordinate of top-left corner",
            },
            width: {
              type: "number",
              minimum: 1,
              description: "Width of region in pixels",
            },
            height: {
              type: "number",
              minimum: 1,
              description: "Height of region in pixels",
            },
            format: {
              type: "string",
              enum: ["png", "jpeg", "webp", "bmp"],
              description: "Image format (default: png)",
            },
            quality: {
              type: "number",
              minimum: 1,
              maximum: 100,
              description:
                "Compression quality for lossy formats (1-100, default: 90)",
            },
            savePath: {
              type: "string",
              description:
                "File path to save screenshot (optional, returns base64 if not provided)",
            },
          },
          required: ["x", "y", "width", "height"],
        },
      },
      {
        name: "screenshot_list_displays",
        description:
          "List all connected displays with resolution and position information",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "screenshot_list_windows",
        description:
          "List all visible windows with title, process, and position information",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];
  }

  /**
   * Handle tool call by routing to appropriate method
   */
  private async handleToolCall(
    name: string,
    args: Record<string, any>
  ): Promise<any> {
    switch (name) {
      case "screenshot_capture_full":
        return await this.mcpTools.captureFullScreen(args);

      case "screenshot_capture_window":
        return await this.mcpTools.captureWindow(args);

      case "screenshot_capture_region":
        return await this.mcpTools.captureRegion({
          x: args["x"] as number,
          y: args["y"] as number,
          width: args["width"] as number,
          height: args["height"] as number,
          format: args["format"] as any,
          quality: args["quality"] as number | undefined,
          savePath: args["savePath"] as string | undefined,
        });

      case "screenshot_list_displays":
        return await this.mcpTools.listDisplays();

      case "screenshot_list_windows":
        return await this.mcpTools.listWindows();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Server is already running");
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.isRunning = true;

    console.error("MCP Screenshot Server started successfully");
  }

  /**
   * Stop the server and cleanup resources
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.mcpTools.cleanup();
    await this.server.close();
    this.isRunning = false;

    console.error("MCP Screenshot Server stopped");
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}
