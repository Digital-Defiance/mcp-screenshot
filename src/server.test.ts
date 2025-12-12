/**
 * Basic smoke tests for MCP ACS Screenshot Server
 */

import { MCPScreenshotServer } from "./server";

describe("MCPScreenshotServer", () => {
  let server: MCPScreenshotServer;

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  it("should create server instance", () => {
    server = new MCPScreenshotServer();
    expect(server).toBeDefined();
    expect(server.isServerRunning()).toBe(false);
  });

  it("should create server with security policy", () => {
    const securityPolicy = {
      allowedDirectories: ["/tmp"],
      maxCapturesPerMinute: 10,
    };
    server = new MCPScreenshotServer(securityPolicy);
    expect(server).toBeDefined();
  });

  it("should create server with excluded window patterns", () => {
    const excludedPatterns = ["*password*", "*auth*"];
    server = new MCPScreenshotServer(undefined, excludedPatterns);
    expect(server).toBeDefined();
  });

  it("should not allow starting server twice", async () => {
    server = new MCPScreenshotServer();

    // Mock the server.connect to avoid actual stdio connection in tests
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    (server as any).server.connect = mockConnect;

    await server.start();
    expect(server.isServerRunning()).toBe(true);

    await expect(server.start()).rejects.toThrow("Server is already running");
  });

  it("should handle stop when not running", async () => {
    server = new MCPScreenshotServer();
    await expect(server.stop()).resolves.not.toThrow();
  });
});
