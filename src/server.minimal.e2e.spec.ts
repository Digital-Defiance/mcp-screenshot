import { spawn, ChildProcess } from "child_process";
import * as path from "path";

/**
 * Minimal E2E test for MCP Screenshot Server
 * Quick smoke test to verify basic functionality
 */
describe("MCP Screenshot Server - Minimal E2E", () => {
  let serverProcess: ChildProcess;
  let messageId = 0;
  let screenshotToolsAvailable = false;

  async function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fs = require("fs");

      // Try multiple possible paths for the CLI
      const possiblePaths = [
        path.join(__dirname, "../../dist/src/cli.js"),
        path.join(__dirname, "../dist/src/cli.js"),
        path.join(process.cwd(), "dist/src/cli.js"),
      ];

      let serverPath: string | undefined;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          serverPath = p;
          break;
        }
      }

      if (!serverPath) {
        reject(
          new Error(
            `Server not found. Tried: ${possiblePaths.join(
              ", "
            )}. Run 'npm run build' first.`
          )
        );
        return;
      }

      console.log(`Starting server from: ${serverPath}`);
      serverProcess = spawn("node", [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (!serverProcess || !serverProcess.stdout || !serverProcess.stdin) {
        reject(new Error("Failed to start server process"));
        return;
      }

      serverProcess.stdout?.setMaxListeners(100);
      serverProcess.stderr?.setMaxListeners(100);
      serverProcess.stdin?.setMaxListeners(100);

      serverProcess.stderr?.on("data", (data) => {
        console.error("Server stderr:", data.toString());
      });

      serverProcess.on("error", (error) => {
        console.error("Server process error:", error);
        reject(error);
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  function sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params: params || {},
      };

      console.log("Sending request:", JSON.stringify(request));

      let responseData = "";
      const timeout = setTimeout(() => {
        console.log("Timeout! Response data so far:", responseData);
        reject(new Error(`Request timeout for ${method}`));
      }, 10000);

      const onData = (data: Buffer) => {
        const chunk = data.toString();
        console.log("Received chunk:", chunk);
        responseData += chunk;

        const lines = responseData.split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              console.log("Parsed response:", response);
              if (response.id === id) {
                clearTimeout(timeout);
                serverProcess.stdout?.removeListener("data", onData);

                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (e) {
              // Not complete JSON yet
            }
          }
        }
      };

      serverProcess.stdout?.on("data", onData);
      serverProcess.stdin?.write(JSON.stringify(request) + "\n");
    });
  }

  function stopServer(): void {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.stdout?.removeAllListeners();
      serverProcess.stderr?.removeAllListeners();
      serverProcess.stdin?.removeAllListeners();
      serverProcess.removeAllListeners();
      serverProcess.kill();
    }
  }

  beforeAll(async () => {
    await startServer();

    // Check if screenshot tools are available
    try {
      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_full",
          arguments: {},
        },
        5000
      );
      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      // Tools are available if we get success OR if we get a capture error (not a missing tool error)
      screenshotToolsAvailable =
        response.status === "success" ||
        (response.status === "error" &&
          response.error.code === "CAPTURE_FAILED");

      if (!screenshotToolsAvailable) {
        console.warn(
          "⚠️  Screenshot capture tools not available. Capture test will be skipped."
        );
        console.warn(`   Error code: ${response.error?.code}`);
      }
    } catch (error) {
      screenshotToolsAvailable = false;
      console.warn(
        "⚠️  Screenshot capture tools not available. Capture test will be skipped."
      );
    }
  }, 60000);

  afterAll(() => {
    stopServer();
  });

  it("should respond to initialize request", async () => {
    const result = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    });

    expect(result).toBeDefined();
    expect(result.protocolVersion).toBeDefined();
    expect(result.serverInfo.name).toBe("mcp-screenshot");
  }, 15000);

  it("should list tools", async () => {
    const result = await sendRequest("tools/list");
    expect(result).toBeDefined();
    expect(result.tools).toBeDefined();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools.length).toBe(5);
  }, 15000);

  it("should list displays", async () => {
    const result = await sendRequest("tools/call", {
      name: "screenshot_list_displays",
      arguments: {},
    });

    expect(result).toBeDefined();
    const textContent = result.content.find((c: any) => c.type === "text");
    const response = JSON.parse(textContent.text);

    expect(response.status).toBe("success");
    expect(response.displays).toBeDefined();
    expect(response.displays.length).toBeGreaterThan(0);
  }, 15000);

  it("should capture full screen or fail gracefully", async () => {
    const result = await sendRequest("tools/call", {
      name: "screenshot_capture_full",
      arguments: {},
    });

    expect(result).toBeDefined();
    const textContent = result.content.find((c: any) => c.type === "text");
    const response = JSON.parse(textContent.text);

    // Should either succeed or fail with CAPTURE_FAILED (tools exist but no display server)
    if (response.status === "success") {
      expect(response.data).toBeDefined();
      expect(response.data.length).toBeGreaterThan(0);
    } else {
      expect(response.status).toBe("error");
      expect(response.error.code).toBe("CAPTURE_FAILED");
      console.log(
        "ℹ️  Screenshot capture failed (expected in headless environment)"
      );
    }
  }, 30000);
});
