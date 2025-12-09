/**
 * Integration tests for MCP Screenshot Server
 * Tests the complete flow of tool registration and execution
 */

import { MCPScreenshotServer } from "./server";

describe("MCPScreenshotServer Integration", () => {
  let server: MCPScreenshotServer;

  beforeEach(() => {
    server = new MCPScreenshotServer();
  });

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  it("should have all 5 tools registered", () => {
    const schemas = (server as any).getToolSchemas();
    expect(schemas).toHaveLength(5);

    const toolNames = schemas.map((s: any) => s.name);
    expect(toolNames).toContain("screenshot_capture_full");
    expect(toolNames).toContain("screenshot_capture_window");
    expect(toolNames).toContain("screenshot_capture_region");
    expect(toolNames).toContain("screenshot_list_displays");
    expect(toolNames).toContain("screenshot_list_windows");
  });

  it("should have proper schema for screenshot_capture_full", () => {
    const schemas = (server as any).getToolSchemas();
    const fullScreenTool = schemas.find(
      (s: any) => s.name === "screenshot_capture_full"
    );

    expect(fullScreenTool).toBeDefined();
    expect(fullScreenTool.description).toBeTruthy();
    expect(fullScreenTool.inputSchema).toBeDefined();
    expect(fullScreenTool.inputSchema.properties).toHaveProperty("display");
    expect(fullScreenTool.inputSchema.properties).toHaveProperty("format");
    expect(fullScreenTool.inputSchema.properties).toHaveProperty("quality");
    expect(fullScreenTool.inputSchema.properties).toHaveProperty("savePath");
    expect(fullScreenTool.inputSchema.properties).toHaveProperty(
      "enablePIIMasking"
    );
  });

  it("should have proper schema for screenshot_capture_window", () => {
    const schemas = (server as any).getToolSchemas();
    const windowTool = schemas.find(
      (s: any) => s.name === "screenshot_capture_window"
    );

    expect(windowTool).toBeDefined();
    expect(windowTool.description).toBeTruthy();
    expect(windowTool.inputSchema).toBeDefined();
    expect(windowTool.inputSchema.properties).toHaveProperty("windowId");
    expect(windowTool.inputSchema.properties).toHaveProperty("windowTitle");
    expect(windowTool.inputSchema.properties).toHaveProperty("includeFrame");
    expect(windowTool.inputSchema.properties).toHaveProperty("format");
  });

  it("should have proper schema for screenshot_capture_region", () => {
    const schemas = (server as any).getToolSchemas();
    const regionTool = schemas.find(
      (s: any) => s.name === "screenshot_capture_region"
    );

    expect(regionTool).toBeDefined();
    expect(regionTool.description).toBeTruthy();
    expect(regionTool.inputSchema).toBeDefined();
    expect(regionTool.inputSchema.properties).toHaveProperty("x");
    expect(regionTool.inputSchema.properties).toHaveProperty("y");
    expect(regionTool.inputSchema.properties).toHaveProperty("width");
    expect(regionTool.inputSchema.properties).toHaveProperty("height");
    expect(regionTool.inputSchema.required).toEqual([
      "x",
      "y",
      "width",
      "height",
    ]);
  });

  it("should have proper schema for screenshot_list_displays", () => {
    const schemas = (server as any).getToolSchemas();
    const displaysTool = schemas.find(
      (s: any) => s.name === "screenshot_list_displays"
    );

    expect(displaysTool).toBeDefined();
    expect(displaysTool.description).toBeTruthy();
    expect(displaysTool.inputSchema).toBeDefined();
  });

  it("should have proper schema for screenshot_list_windows", () => {
    const schemas = (server as any).getToolSchemas();
    const windowsTool = schemas.find(
      (s: any) => s.name === "screenshot_list_windows"
    );

    expect(windowsTool).toBeDefined();
    expect(windowsTool.description).toBeTruthy();
    expect(windowsTool.inputSchema).toBeDefined();
  });

  it("should throw error for unknown tool", async () => {
    await expect(
      (server as any).handleToolCall("unknown_tool", {})
    ).rejects.toThrow("Unknown tool: unknown_tool");
  });

  it("should route screenshot_list_displays correctly", async () => {
    const result = await (server as any).handleToolCall(
      "screenshot_list_displays",
      {}
    );
    expect(result).toHaveProperty("status");
    expect(result.status).toBe("success");
    expect(result).toHaveProperty("displays");
  }, 30000);

  it("should route screenshot_list_windows correctly", async () => {
    const result = await (server as any).handleToolCall(
      "screenshot_list_windows",
      {}
    );
    expect(result).toHaveProperty("status");
    expect(result.status).toBe("success");
    expect(result).toHaveProperty("windows");
  }, 30000);
});
