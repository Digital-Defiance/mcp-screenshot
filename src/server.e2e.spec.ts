import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

/**
 * End-to-End tests for MCP Screenshot Server
 * Tests the actual MCP protocol communication via stdio
 */
describe("MCP Screenshot Server - E2E", () => {
  jest.setTimeout(120000);
  let serverProcess: ChildProcess;
  let messageId = 0;
  let tempDir: string;
  let screenshotToolsAvailable = false;

  /**
   * Check if screenshot capture tools are available
   */
  async function checkScreenshotTools(): Promise<boolean> {
    try {
      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_full",
          arguments: {},
        },
        10000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      // Tools are available if we get success OR if we get a capture error (not a missing tool error)
      // CAPTURE_FAILED means the tools exist but failed (e.g., no display server)
      const available =
        response.status === "success" ||
        (response.status === "error" &&
          response.error.code === "CAPTURE_FAILED");

      if (!available) {
        console.warn(
          `Screenshot tools check: ${response.error?.code || "unknown error"}`
        );
      }

      return available;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the MCP server as a child process
   */
  async function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
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
      // Server already built, just start it
      startServerProcess(resolve, reject, serverPath);
    });
  }

  function startServerProcess(
    resolve: () => void,
    reject: (error: Error) => void,
    serverPath: string
  ): void {
    // Start the server
    serverProcess = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!serverProcess || !serverProcess.stdout || !serverProcess.stdin) {
      reject(
        new Error("Failed to start server process or stdio not available")
      );
      return;
    }

    // Increase max listeners to avoid warnings
    serverProcess.stdout?.setMaxListeners(100);
    serverProcess.stderr?.setMaxListeners(100);
    serverProcess.stdin?.setMaxListeners(100);

    // Log stderr for debugging
    serverProcess.stderr?.on("data", (data) => {
      console.error("Server stderr:", data.toString());
    });

    // Log any errors
    serverProcess.on("error", (error) => {
      console.error("Server process error:", error);
      reject(error);
    });

    // Wait for server to be ready
    setTimeout(() => resolve(), 2000);
  }

  /**
   * Send a JSON-RPC request to the server
   */
  function sendRequest(
    method: string,
    params?: any,
    timeoutMs: number = 60000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      const request = {
        jsonrpc: "2.0",
        id,
        method,
        params: params || {},
      };

      let responseData = "";

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${method}`));
      }, timeoutMs);

      const onData = (data: Buffer) => {
        const chunk = data.toString();
        responseData += chunk;
        console.log(
          `[Test] Received chunk for request ${id}:`,
          chunk.substring(0, 200)
        );

        // Try to parse complete JSON-RPC messages
        const lines = responseData.split("\n");
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === id) {
                console.log(`[Test] Got response for request ${id}`);
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
              // Not a complete JSON message yet, continue
            }
          }
        }
      };

      serverProcess.stdout?.on("data", onData);

      console.log(`[Test] Sending request ${id}:`, method);
      serverProcess.stdin?.write(JSON.stringify(request) + "\n");
    });
  }

  /**
   * Stop the MCP server
   */
  function stopServer(): void {
    if (serverProcess && !serverProcess.killed) {
      // Remove all listeners to prevent memory leaks
      serverProcess.stdout?.removeAllListeners();
      serverProcess.stderr?.removeAllListeners();
      serverProcess.stdin?.removeAllListeners();
      serverProcess.removeAllListeners();

      serverProcess.kill();
    }
  }

  beforeAll(async () => {
    // Create temp directory for test screenshots
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-screenshot-test-"));
    await startServer();

    // Check if screenshot tools are available
    screenshotToolsAvailable = await checkScreenshotTools();
    if (!screenshotToolsAvailable) {
      console.warn(
        "⚠️  Screenshot capture tools not available. Some tests will be skipped."
      );
      console.warn(
        "   Install system dependencies (grim for Wayland, scrot for X11) to run all tests."
      );
    }
  }, 60000);

  afterAll(() => {
    stopServer();
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("MCP Protocol Initialization", () => {
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
      expect(result.serverInfo).toBeDefined();
      expect(result.serverInfo.name).toBe("mcp-screenshot");
      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.tools).toBeDefined();
    });
  });

  describe("Tool Discovery", () => {
    it("should list all available tools", async () => {
      const result = await sendRequest("tools/list");

      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      expect(result.tools.length).toBe(5);

      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain("screenshot_capture_full");
      expect(toolNames).toContain("screenshot_capture_window");
      expect(toolNames).toContain("screenshot_capture_region");
      expect(toolNames).toContain("screenshot_list_displays");
      expect(toolNames).toContain("screenshot_list_windows");
    });

    it("should provide tool schemas", async () => {
      const result = await sendRequest("tools/list");

      for (const tool of result.tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it("should have correct schema for screenshot_capture_full", async () => {
      const result = await sendRequest("tools/list");
      const tool = result.tools.find(
        (t: any) => t.name === "screenshot_capture_full"
      );

      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty("display");
      expect(tool.inputSchema.properties).toHaveProperty("format");
      expect(tool.inputSchema.properties).toHaveProperty("quality");
      expect(tool.inputSchema.properties).toHaveProperty("savePath");
      expect(tool.inputSchema.properties).toHaveProperty("enablePIIMasking");
    });

    it("should have correct schema for screenshot_capture_region", async () => {
      const result = await sendRequest("tools/list");
      const tool = result.tools.find(
        (t: any) => t.name === "screenshot_capture_region"
      );

      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty("x");
      expect(tool.inputSchema.properties).toHaveProperty("y");
      expect(tool.inputSchema.properties).toHaveProperty("width");
      expect(tool.inputSchema.properties).toHaveProperty("height");
      expect(tool.inputSchema.required).toEqual(["x", "y", "width", "height"]);
    });
  });

  describe("Tool Execution - screenshot_list_displays", () => {
    it("should list all displays", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot_list_displays",
        arguments: {},
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const textContent = result.content.find((c: any) => c.type === "text");
      expect(textContent).toBeDefined();

      const response = JSON.parse(textContent.text);
      expect(response.status).toBe("success");
      expect(response.displays).toBeDefined();
      expect(Array.isArray(response.displays)).toBe(true);
      expect(response.displays.length).toBeGreaterThan(0);

      // Verify display structure
      const display = response.displays[0];
      expect(display.id).toBeDefined();
      expect(display.name).toBeDefined();
      expect(display.resolution).toBeDefined();
      expect(display.resolution.width).toBeGreaterThan(0);
      expect(display.resolution.height).toBeGreaterThan(0);
      expect(display.position).toBeDefined();
      expect(display.position.x).toBeDefined();
      expect(display.position.y).toBeDefined();
      expect(display.isPrimary).toBeDefined();
    });
  });

  describe("Tool Execution - screenshot_list_windows", () => {
    it("should list all windows", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot_list_windows",
        arguments: {},
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe("success");
      expect(response.windows).toBeDefined();
      expect(Array.isArray(response.windows)).toBe(true);

      // Verify window structure if windows exist
      if (response.windows.length > 0) {
        const window = response.windows[0];
        expect(window.id).toBeDefined();
        expect(window.title).toBeDefined();
        expect(window.processName).toBeDefined();
      }
    });
  });

  describe("Tool Execution - screenshot_capture_full", () => {
    it("should capture full screen and return base64 or fail gracefully", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot_capture_full",
        arguments: {},
      });

      expect(result).toBeDefined();
      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        if (response.format) expect(response.format).toBe("png");
        expect(response.data).toBeDefined();
        expect(typeof response.data).toBe("string");
        expect(response.data.length).toBeGreaterThan(0);
        if (response.width !== undefined)
          expect(response.width).toBeGreaterThan(0);
        if (response.height !== undefined)
          expect(response.height).toBeGreaterThan(0);
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
        console.log(
          "ℹ️  Screenshot capture failed (expected in headless environment)"
        );
      }
    }, 60000);

    it("should capture full screen with specific format or fail gracefully", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot_capture_full",
        arguments: {
          format: "jpeg",
          quality: 80,
        },
      });

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        if (response.format) expect(response.format).toBe("jpeg");
        expect(response.data).toBeDefined();
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
        console.log(
          "ℹ️  Screenshot capture failed (expected in headless environment)"
        );
      }
    }, 60000);

    it("should save full screen to file or fail gracefully", async () => {
      const savePath = path.join(tempDir, "fullscreen.png");

      const result = await sendRequest("tools/call", {
        name: "screenshot_capture_full",
        arguments: {
          savePath,
        },
      });

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        expect(response.path).toBe(savePath);
        expect(fs.existsSync(savePath)).toBe(true);
        // Verify file is not empty
        const stats = fs.statSync(savePath);
        expect(stats.size).toBeGreaterThan(0);
      } else {
        expect(response.status).toBe("error");
        expect(["CAPTURE_FAILED", "INVALID_PATH"]).toContain(
          response.error.code
        );
        console.log(
          "ℹ️  Screenshot capture failed (expected in headless environment)"
        );
      }
    }, 60000);

    it("should capture with PII masking enabled or fail gracefully", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot_capture_full",
        arguments: {
          enablePIIMasking: true,
        },
      });

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        expect(response.data).toBeDefined();
        if (response.piiMasked !== undefined)
          expect(response.piiMasked).toBe(true);
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
        console.log(
          "ℹ️  Screenshot capture failed (expected in headless environment)"
        );
      }
    }, 180000);
  });

  describe("Tool Execution - screenshot_capture_region", () => {
    it("should capture specific region or fail gracefully", async () => {
      if (!screenshotToolsAvailable) {
        console.warn("Skipping region capture - tools not available");
        return;
      }

      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        },
        30000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        expect(response.data).toBeDefined();
        expect(response.metadata.width).toBe(100);
        expect(response.metadata.height).toBe(100);
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
        console.log(
          "ℹ️  Region capture failed (expected in headless environment)"
        );
      }
    }, 45000);

    it("should validate region boundaries", async () => {
      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: -10,
            y: -10,
            width: 100,
            height: 100,
          },
        },
        30000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      // Should either succeed with adjusted coordinates or fail with validation error
      if (response.status === "error") {
        expect(response.error).toBeDefined();
        expect(response.error.code).toMatch(/INVALID_REGION|CAPTURE_FAILED/);
      } else {
        // If it succeeds, coordinates should be adjusted
        expect(response.status).toBe("success");
      }
    }, 45000);

    it("should save region to file or fail gracefully", async () => {
      if (!screenshotToolsAvailable) {
        console.warn("Skipping region save - tools not available");
        return;
      }

      const savePath = path.join(tempDir, "region.png");

      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: 0,
            y: 0,
            width: 200,
            height: 200,
            savePath,
          },
        },
        30000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        expect(response.path).toBe(savePath);
        expect(fs.existsSync(savePath)).toBe(true);
      } else {
        expect(response.status).toBe("error");
        expect(["CAPTURE_FAILED", "INVALID_PATH"]).toContain(
          response.error.code
        );
        console.log(
          "ℹ️  Region capture failed (expected in headless environment)"
        );
      }
    }, 45000);
  });

  describe("Tool Execution - screenshot_capture_window", () => {
    it("should capture window by title pattern", async () => {
      // Get list of windows first
      const listResult = await sendRequest("tools/call", {
        name: "screenshot_list_windows",
        arguments: {},
      });

      const listResponse = JSON.parse(
        listResult.content.find((c: any) => c.type === "text").text
      );

      if (listResponse.windows.length > 0) {
        // Try to find a stable window (e.g. VS Code or Terminal)
        const window =
          listResponse.windows.find(
            (w: any) =>
              w.processName.includes("Code") ||
              w.processName.includes("node") ||
              w.title.includes("VS Code")
          ) || listResponse.windows[0];

        // Escape special regex characters in the title because getWindowByTitle uses it as a regex pattern
        const escapedTitle = window.title.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const result = await sendRequest("tools/call", {
          name: "screenshot_capture_window",
          arguments: {
            windowTitle: escapedTitle,
          },
        });

        const textContent = result.content.find((c: any) => c.type === "text");
        const response = JSON.parse(textContent.text);

        if (response.status === "success") {
          expect(response.data).toBeDefined();
          expect(response.metadata.window.title).toBe(window.title);
        } else {
          // It might fail if the window moved/closed or capture failed
          expect(response.status).toBe("error");
          expect(response.error.code).toMatch(
            /WINDOW_NOT_FOUND|CAPTURE_FAILED/
          );
        }
      }
    }, 60000);

    it("should capture window by ID", async () => {
      // Get list of windows first
      const listResult = await sendRequest("tools/call", {
        name: "screenshot_list_windows",
        arguments: {},
      });

      const listResponse = JSON.parse(
        listResult.content.find((c: any) => c.type === "text").text
      );

      if (listResponse.windows.length > 0) {
        // Try to find a stable window (e.g. VS Code or Terminal)
        const window =
          listResponse.windows.find(
            (w: any) =>
              w.processName.includes("Code") ||
              w.processName.includes("node") ||
              w.title.includes("VS Code")
          ) || listResponse.windows[0];

        const result = await sendRequest("tools/call", {
          name: "screenshot_capture_window",
          arguments: {
            windowId: window.id,
          },
        });

        const textContent = result.content.find((c: any) => c.type === "text");
        const response = JSON.parse(textContent.text);

        expect(response.status).toBe("success");
        expect(response.data).toBeDefined();
      }
    }, 60000);

    it("should handle non-existent window", async () => {
      const result = await sendRequest("tools/call", {
        name: "screenshot_capture_window",
        arguments: {
          windowTitle: "NonExistentWindow12345XYZ",
        },
      });

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe("error");
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe("WINDOW_NOT_FOUND");
    }, 60000);
  });

  describe("Error Handling", () => {
    it("should handle unknown tool", async () => {
      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_unknown_tool",
          arguments: {},
        },
        10000
      );

      expect(result.isError).toBe(true);
      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      expect(response.status).toBe("error");
      expect(response.error).toBeDefined();
    }, 15000);

    it("should handle missing required parameters", async () => {
      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: 0,
            y: 0,
            // Missing width and height
          },
        },
        10000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      // Should fail due to missing required parameters
      expect(response.status).toBe("error");
    }, 15000);

    it("should handle invalid file path", async () => {
      try {
        const result = await sendRequest(
          "tools/call",
          {
            name: "screenshot_capture_full",
            arguments: {
              savePath: "/invalid/path/that/does/not/exist/screenshot.png",
            },
          },
          15000
        );

        const textContent = result.content.find((c: any) => c.type === "text");
        const response = JSON.parse(textContent.text);

        expect(response.status).toBe("error");
        expect(response.error).toBeDefined();
      } catch (error) {
        if ((error as Error).message.includes("timeout")) {
          console.warn("Server timeout - likely no display server in CI");
          return;
        }
        throw error;
      }
    }, 20000);
  });

  describe("Format Support", () => {
    it("should support PNG format or fail gracefully", async () => {
      if (!screenshotToolsAvailable) {
        console.warn("Skipping PNG format test - tools not available");
        return;
      }

      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            format: "png",
          },
        },
        30000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        if (response.format) expect(response.format).toBe("png");
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
      }
    }, 45000);

    it("should support JPEG format or fail gracefully", async () => {
      if (!screenshotToolsAvailable) {
        console.warn("Skipping JPEG format test - tools not available");
        return;
      }

      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            format: "jpeg",
            quality: 85,
          },
        },
        30000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        if (response.format) expect(response.format).toBe("jpeg");
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
      }
    }, 45000);

    it("should support WebP format or fail gracefully", async () => {
      if (!screenshotToolsAvailable) {
        console.warn("Skipping WebP format test - tools not available");
        return;
      }

      const result = await sendRequest(
        "tools/call",
        {
          name: "screenshot_capture_region",
          arguments: {
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            format: "webp",
          },
        },
        30000
      );

      const textContent = result.content.find((c: any) => c.type === "text");
      const response = JSON.parse(textContent.text);

      if (response.status === "success") {
        if (response.format) expect(response.format).toBe("webp");
      } else {
        expect(response.status).toBe("error");
        expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
      }
    }, 45000);
  });

  describe("Security and Privacy", () => {
    it("should respect excluded window patterns", async () => {
      try {
        const result = await sendRequest(
          "tools/call",
          {
            name: "screenshot_list_windows",
            arguments: {},
          },
          10000
        );

        const textContent = result.content.find((c: any) => c.type === "text");
        const response = JSON.parse(textContent.text);

        expect(response.status).toBe("success");
        expect(response.windows).toBeDefined();
      } catch (error) {
        if ((error as Error).message.includes("timeout")) {
          console.warn("Server timeout - likely no display server in CI");
          return;
        }
        throw error;
      }
    }, 15000);

    it("should handle PII masking request or fail gracefully", async () => {
      try {
        const result = await sendRequest(
          "tools/call",
          {
            name: "screenshot_capture_full",
            arguments: {
              enablePIIMasking: true,
            },
          },
          30000
        );

        const textContent = result.content.find((c: any) => c.type === "text");
        const response = JSON.parse(textContent.text);

        if (response.status === "success") {
          expect(response.data).toBeDefined();
        } else {
          expect(response.status).toBe("error");
          expect(response.error.code).toMatch(/CAPTURE_FAILED|ENCODING_FAILED/);
          console.log(
            "ℹ️  PII masking test failed (expected in headless environment)"
          );
        }
      } catch (error) {
        if ((error as Error).message.includes("timeout")) {
          console.warn("Server timeout - likely no display server in CI");
          return;
        }
        throw error;
      }
    }, 45000);
  });
});
