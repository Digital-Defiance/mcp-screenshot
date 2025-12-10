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

      // Function to recursively search for CLI file
      function findCliFile(dir: string, maxDepth: number = 3): string | null {
        if (maxDepth <= 0) return null;

        const cliPath = path.join(dir, "dist/cli.js");
        if (fs.existsSync(cliPath)) {
          // Verify this is the screenshot CLI by checking package.json
          try {
            const packagePath = path.join(dir, "package.json");
            if (fs.existsSync(packagePath)) {
              const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
              if (pkg.name === "@ai-capabilities-suite/mcp-screenshot") {
                return cliPath;
              }
            }
          } catch (e) {
            // If we can't verify, still return it as fallback
            return cliPath;
          }
        }

        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (
              entry.isDirectory() &&
              !entry.name.startsWith(".") &&
              entry.name !== "node_modules"
            ) {
              const found = findCliFile(
                path.join(dir, entry.name),
                maxDepth - 1
              );
              if (found) return found;
            }
          }
        } catch (e) {
          // Ignore permission errors
        }

        return null;
      }

      // Try multiple possible paths for the CLI
      const possiblePaths = [
        path.join(__dirname, "../../dist/cli.js"),
        path.join(__dirname, "../dist/cli.js"),
        path.join(process.cwd(), "dist/cli.js"),
      ];

      let serverPath: string | undefined;

      // First try direct paths
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          serverPath = p;
          break;
        }
      }

      // If not found, search recursively from current directory and parent directories
      if (!serverPath) {
        const searchDirs = [
          process.cwd(),
          path.dirname(process.cwd()),
          path.dirname(path.dirname(process.cwd())),
        ];
        for (const dir of searchDirs) {
          serverPath = findCliFile(dir) || undefined;
          if (serverPath) break;
        }
      }

      if (!serverPath) {
        // Debug info for CI
        console.log("Debug info for CI:");
        console.log("Current working directory:", process.cwd());
        console.log("__dirname:", __dirname);
        console.log("Tried paths:", possiblePaths);

        // List directory contents to debug
        try {
          console.log(
            "Contents of current directory:",
            fs.readdirSync(process.cwd())
          );
          if (fs.existsSync("dist")) {
            console.log("Contents of dist:", fs.readdirSync("dist"));
            if (fs.existsSync("dist/src")) {
              console.log("Contents of dist/src:", fs.readdirSync("dist/src"));
            }
          }
        } catch (e) {
          console.log("Error listing directories:", e.message);
        }

        reject(
          new Error(
            `Server not found. Tried: ${possiblePaths.join(
              ", "
            )} and searched recursively from ${process.cwd()}. Run 'npm run build' first.`
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
      }, 60000);

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
      const result = await sendRequest("tools/call", {
        name: "screenshot_capture_full",
        arguments: {},
      });
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
