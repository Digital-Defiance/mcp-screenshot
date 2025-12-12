# 📸 MCP ACS Screenshot Server

[![NPM Version](https://img.shields.io/npm/v/@ai-capabilities-suite/mcp-screenshot)](https://www.npmjs.com/package/@ai-capabilities-suite/mcp-screenshot)
[![GitHub Release](https://img.shields.io/github/v/release/digital-defiance/mcp-screenshot?label=Release&logo=github)](https://github.com/digital-defiance/mcp-screenshot/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Docker Pulls](https://img.shields.io/docker/pulls/digitaldefiance/mcp-screenshot)](https://hub.docker.com/r/digitaldefiance/mcp-screenshot)

**Give AI agents visual superpowers to see, analyze, and document your applications like senior UX designers.**

This enterprise-grade MCP server transforms AI from code-only assistants into visual experts capable of UI analysis, accessibility auditing, documentation generation, and responsive design testing.

## 🔗 Repository

This package is now maintained in its own repository: **[https://github.com/Digital-Defiance/mcp-screenshot](https://github.com/Digital-Defiance/mcp-screenshot)**

This repository is part of the [AI Capabilitites Suite](https://github.com/Digital-Defiance/ai-capabilitites-suite) on GitHub.

## 🤔 Why Do AI Agents Need Visual Capabilities?

**AI agents today are powerful but visually blind:**

- ❌ Can read HTML/CSS but can't see actual layouts
- ❌ Can suggest UI improvements without seeing the real user experience
- ❌ Can't detect accessibility issues like poor contrast or spacing
- ❌ Can't create visual documentation or bug reports
- ❌ Can't analyze responsive design across different screen sizes

**Result:** You're stuck manually creating screenshots, documentation, and visual analysis that AI should handle.

---

## 🎯 Revolutionary Use Cases

### 📚 **"AI, create professional documentation"**

```
You: "Document the checkout process with screenshots"
AI: *Captures each step, analyzes UI flow*
AI: "Generated complete user guide with 6 annotated screenshots, highlighting key interactions and error states..."
```

### 🔍 **"AI, audit this page for accessibility"**

```
You: "Check if this form meets WCAG guidelines"
AI: *Captures form, analyzes visual elements*
AI: "Found 4 accessibility issues: contrast ratio 2.1:1 (needs 4.5:1), missing focus indicators, touch targets too small..."
```

### 🐛 **"AI, create a detailed bug report"**

```
You: "The mobile navigation is broken"
AI: *Captures different viewport sizes*
AI: "Created bug report with before/after screenshots, exact breakpoint where it fails, and CSS fix suggestions..."
```

### 🎨 **"AI, compare these design variations"**

```
You: "Which hero section design works better?"
AI: *Captures both versions, analyzes visual hierarchy*
AI: "Version B has 28% better visual flow—CTA more prominent, text hierarchy clearer, better use of whitespace..."
```

### 📱 **"AI, test responsive design"**

```
You: "How does this look on different screen sizes?"
AI: *Captures multiple viewport sizes*
AI: "Layout breaks at 768px—sidebar overlaps content. Here's the media query fix with visual proof..."
```

---

## ✨ What This Changes

**Before:** AI worked blind, relying on code descriptions

- ❌ "The button looks wrong" → AI guesses the issue
- ❌ "Create documentation" → AI writes generic text
- ❌ "Check accessibility" → AI only reviews code
- ❌ "Test responsive design" → AI can't see actual breakpoints

**After:** AI sees and analyzes your actual user interface

- ✅ **Visual debugging** - AI identifies exact pixel-level issues
- ✅ **Smart documentation** - AI creates guides with real screenshots and annotations
- ✅ **Accessibility audits** - AI measures actual contrast ratios and spacing
- ✅ **Responsive testing** - AI captures and compares different screen sizes
- ✅ **Design analysis** - AI evaluates visual hierarchy and user experience
- ✅ **Professional reports** - AI creates detailed visual evidence for bugs and improvements

---

## 🚀 Features

- **Multi-format Support**: PNG, JPEG, WebP, BMP with configurable quality
- **Flexible Capture**: Full screen, specific windows, or custom regions
- **Privacy Protection**: PII masking with OCR-based detection for emails, phone numbers, and credit cards
- **Security Controls**: Path validation, rate limiting, audit logging, and configurable policies
- **Cross-platform**: Linux (X11/Wayland), macOS, Windows with native APIs
- **Multi-monitor Support**: Capture from specific displays in multi-monitor setups
- **Enterprise Security**: Window exclusion, audit logging, rate limiting
- **AI-Optimized**: Structured responses perfect for AI agent workflows

## Installation

### NPM Installation

```bash
npm install @ai-capabilities-suite/mcp-screenshot
```

### System Requirements

**Linux:**

- X11: `imagemagick` package (provides `import` command)
- Wayland: `grim` package

```bash
# Ubuntu/Debian
sudo apt-get install imagemagick grim

# Fedora
sudo dnf install ImageMagick grim

# Arch
sudo pacman -S imagemagick grim
```

**macOS:**

- Built-in `screencapture` command (no additional dependencies)
- Screen Recording permission required (System Preferences > Security & Privacy > Privacy > Screen Recording)

**Windows:**

- No additional dependencies required

### MCP Configuration

Add to your MCP settings file (e.g., `~/.kiro/settings/mcp.json` or `.kiro/settings/mcp.json`):

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "node",
      "args": ["/path/to/mcp-screenshot/dist/cli.js"],
      "env": {
        "SCREENSHOT_ALLOWED_DIRS": "/home/user/screenshots,/tmp",
        "SCREENSHOT_MAX_CAPTURES_PER_MIN": "60",
        "SCREENSHOT_ENABLE_AUDIT_LOG": "true"
      }
    }
  }
}
```

## 🛠️ 5 Professional MCP Tools

**Purpose-built for AI agents to capture, analyze, and work with visual information:**

The server exposes 5 comprehensive MCP tools that enable AI agents to see and understand your applications:

### 1. screenshot_capture_full

Capture full screen or specific display.

**Parameters:**

- `display` (string, optional): Display ID to capture (defaults to primary display)
- `format` (string, optional): Image format - `png`, `jpeg`, `webp`, or `bmp` (default: `png`)
- `quality` (number, optional): Compression quality 1-100 for lossy formats (default: 90)
- `savePath` (string, optional): File path to save screenshot (returns base64 if not provided)
- `enablePIIMasking` (boolean, optional): Enable PII detection and masking (default: false)

**Example:**

```json
{
  "name": "screenshot_capture_full",
  "arguments": {
    "format": "png",
    "savePath": "/home/user/screenshots/desktop.png",
    "enablePIIMasking": true
  }
}
```

**Response:**

```json
{
  "status": "success",
  "filePath": "/home/user/screenshots/desktop.png",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "png",
    "fileSize": 245678,
    "timestamp": "2024-12-01T10:30:00.000Z",
    "display": {
      "id": "0",
      "name": "Primary Display",
      "resolution": { "width": 1920, "height": 1080 },
      "position": { "x": 0, "y": 0 },
      "isPrimary": true
    },
    "piiMasking": {
      "emailsRedacted": 2,
      "phonesRedacted": 1,
      "creditCardsRedacted": 0,
      "customPatternsRedacted": 0
    }
  }
}
```

### 2. screenshot_capture_window

Capture specific application window by ID or title pattern.

**Parameters:**

- `windowId` (string, optional): Window identifier (use `windowId` or `windowTitle`)
- `windowTitle` (string, optional): Window title pattern to match (use `windowId` or `windowTitle`)
- `includeFrame` (boolean, optional): Include window frame and title bar (default: false)
- `format` (string, optional): Image format (default: `png`)
- `quality` (number, optional): Compression quality 1-100 (default: 90)
- `savePath` (string, optional): File path to save screenshot

**Example:**

```json
{
  "name": "screenshot_capture_window",
  "arguments": {
    "windowTitle": "Chrome",
    "includeFrame": false,
    "format": "jpeg",
    "quality": 85
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/jpeg",
  "metadata": {
    "width": 1280,
    "height": 720,
    "format": "jpeg",
    "fileSize": 89234,
    "timestamp": "2024-12-01T10:31:00.000Z",
    "window": {
      "id": "12345",
      "title": "Google Chrome",
      "processName": "chrome",
      "pid": 5678,
      "bounds": { "x": 100, "y": 100, "width": 1280, "height": 720 }
    }
  }
}
```

### 3. screenshot_capture_region

Capture specific rectangular region of the screen.

**Parameters:**

- `x` (number, required): X coordinate of top-left corner
- `y` (number, required): Y coordinate of top-left corner
- `width` (number, required): Width of region in pixels
- `height` (number, required): Height of region in pixels
- `format` (string, optional): Image format (default: `png`)
- `quality` (number, optional): Compression quality 1-100 (default: 90)
- `savePath` (string, optional): File path to save screenshot

**Example:**

```json
{
  "name": "screenshot_capture_region",
  "arguments": {
    "x": 100,
    "y": 100,
    "width": 800,
    "height": 600,
    "format": "png"
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png",
  "metadata": {
    "width": 800,
    "height": 600,
    "format": "png",
    "fileSize": 123456,
    "timestamp": "2024-12-01T10:32:00.000Z",
    "region": {
      "x": 100,
      "y": 100,
      "width": 800,
      "height": 600
    }
  }
}
```

### 4. screenshot_list_displays

List all connected displays with resolution and position information.

**Parameters:** None

**Example:**

```json
{
  "name": "screenshot_list_displays",
  "arguments": {}
}
```

**Response:**

```json
{
  "status": "success",
  "displays": [
    {
      "id": "0",
      "name": "Primary Display",
      "resolution": { "width": 1920, "height": 1080 },
      "position": { "x": 0, "y": 0 },
      "isPrimary": true
    },
    {
      "id": "1",
      "name": "Secondary Display",
      "resolution": { "width": 1920, "height": 1080 },
      "position": { "x": 1920, "y": 0 },
      "isPrimary": false
    }
  ]
}
```

### 5. screenshot_list_windows

List all visible windows with title, process, and position information.

**Parameters:** None

**Example:**

```json
{
  "name": "screenshot_list_windows",
  "arguments": {}
}
```

**Response:**

```json
{
  "status": "success",
  "windows": [
    {
      "id": "12345",
      "title": "Google Chrome",
      "processName": "chrome",
      "pid": 5678,
      "bounds": { "x": 100, "y": 100, "width": 1280, "height": 720 },
      "isMinimized": false
    },
    {
      "id": "67890",
      "title": "Terminal",
      "processName": "gnome-terminal",
      "pid": 9012,
      "bounds": { "x": 200, "y": 200, "width": 800, "height": 600 },
      "isMinimized": false
    }
  ]
}
```

## Security Configuration

The server enforces security policies to control screenshot operations. Configure via environment variables or security policy file.

### Environment Variables

- `SCREENSHOT_ALLOWED_DIRS`: Comma-separated list of allowed directories for saving screenshots
- `SCREENSHOT_MAX_CAPTURES_PER_MIN`: Maximum captures per minute (default: 60)
- `SCREENSHOT_ENABLE_AUDIT_LOG`: Enable audit logging (default: true)
- `SCREENSHOT_BLOCKED_WINDOWS`: Comma-separated list of window title patterns to exclude

### Security Policy File

Create a `security-policy.json` file:

```json
{
  "allowedDirectories": ["/home/user/screenshots", "/tmp/screenshots"],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*1Password.*",
    ".*LastPass.*",
    ".*Bitwarden.*",
    ".*Authentication.*"
  ],
  "maxCapturesPerMinute": 60,
  "enableAuditLog": true
}
```

Load the policy when starting the server:

```typescript
import { MCPScreenshotServer } from "@ai-capabilities-suite/mcp-screenshot";
import * as fs from "fs";

const policy = JSON.parse(fs.readFileSync("security-policy.json", "utf-8"));
const server = new MCPScreenshotServer(policy);
await server.start();
```

## Error Handling

All tools return structured error responses with error codes and remediation suggestions.

### Error Codes

| Code                  | Description                              | Remediation                                                         |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `PERMISSION_DENIED`   | Insufficient permissions to capture      | Grant Screen Recording permission (macOS) or check user permissions |
| `INVALID_PATH`        | File path outside allowed directories    | Use a path within configured allowed directories                    |
| `WINDOW_NOT_FOUND`    | Specified window does not exist          | Use `screenshot_list_windows` to find available windows             |
| `DISPLAY_NOT_FOUND`   | Specified display does not exist         | Use `screenshot_list_displays` to find available displays           |
| `UNSUPPORTED_FORMAT`  | Requested format not supported           | Use png, jpeg, webp, or bmp                                         |
| `CAPTURE_FAILED`      | Screenshot capture failed                | Check permissions and try again                                     |
| `RATE_LIMIT_EXCEEDED` | Too many captures in time window         | Wait before making additional requests                              |
| `INVALID_REGION`      | Invalid region coordinates or dimensions | Ensure coordinates are non-negative and dimensions are positive     |
| `OUT_OF_MEMORY`       | Insufficient memory for operation        | Reduce capture size or close other applications                     |
| `ENCODING_FAILED`     | Image encoding failed                    | Try different format or reduce quality                              |
| `FILE_SYSTEM_ERROR`   | File system operation failed             | Check permissions and disk space                                    |

### Error Response Format

```json
{
  "status": "error",
  "error": {
    "code": "WINDOW_NOT_FOUND",
    "message": "Window with ID '12345' not found",
    "details": {
      "windowId": "12345"
    },
    "remediation": "Verify the window exists and is visible. Use screenshot_list_windows to see available windows."
  }
}
```

## Troubleshooting

### Linux Issues

**Problem:** `import: command not found` or `grim: command not found`

**Solution:** Install required packages:

```bash
# X11
sudo apt-get install imagemagick

# Wayland
sudo apt-get install grim
```

**Problem:** Black screen or empty captures

**Solution:** Check display server environment variables:

```bash
echo $DISPLAY  # Should show :0 or similar for X11
echo $WAYLAND_DISPLAY  # Should show wayland-0 or similar for Wayland
```

### macOS Issues

**Problem:** `PERMISSION_DENIED` error

**Solution:** Grant Screen Recording permission:

1. Open System Preferences > Security & Privacy > Privacy
2. Select "Screen Recording" from the list
3. Add your terminal application or Node.js to the allowed list
4. Restart the application

**Problem:** Retina display captures are double resolution

**Solution:** This is expected behavior. Retina displays have 2x pixel density. Use the `width` and `height` from metadata to determine actual dimensions.

### Windows Issues

**Problem:** Capture fails with access denied

**Solution:** Run the application with administrator privileges or check Windows Defender settings.

**Problem:** Multi-monitor captures show wrong display

**Solution:** Use `screenshot_list_displays` to get correct display IDs and positions.

### General Issues

**Problem:** `RATE_LIMIT_EXCEEDED` error

**Solution:** The server limits captures to prevent abuse. Wait 60 seconds or adjust `maxCapturesPerMinute` in security policy.

**Problem:** `INVALID_PATH` error when saving

**Solution:** Ensure the save path is within allowed directories configured in security policy.

**Problem:** PII masking not working

**Solution:**

- Ensure tesseract.js is properly installed
- Check that `eng.traineddata` language file is available
- PII masking requires OCR which may be slow on large images

**Problem:** Large file sizes

**Solution:**

- Use JPEG format with lower quality (60-80) for smaller files
- Use WebP format for best compression
- Reduce capture region size if possible

**Problem:** Out of memory errors

**Solution:**

- Capture smaller regions instead of full screen
- Reduce quality settings
- Close other applications to free memory
- Use streaming for very large captures

## Programmatic Usage

### TypeScript/JavaScript

```typescript
import { MCPScreenshotServer } from "@ai-capabilities-suite/mcp-screenshot";

// Create server with custom security policy
const server = new MCPScreenshotServer({
  allowedDirectories: ["/home/user/screenshots"],
  maxCapturesPerMinute: 30,
  enableAuditLog: true,
  blockedWindowPatterns: [".*Password.*"],
});

// Start server
await server.start();

// Server will handle MCP protocol requests via stdio
// Keep process running
process.on("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
```

### Direct Capture Engine Usage

```typescript
import { createCaptureEngine } from "@ai-capabilities-suite/mcp-screenshot";

// Create platform-specific capture engine
const engine = createCaptureEngine();

// Capture full screen
const fullScreen = await engine.captureScreen();

// List and capture windows
const windows = await engine.getWindows();
const window = windows.find((w) => w.title.includes("Chrome"));
if (window) {
  const buffer = await engine.captureWindow(window.id, false);
}

// Capture region
const region = await engine.captureRegion(100, 100, 800, 600);

// List displays
const displays = await engine.getDisplays();
console.log(`Found ${displays.length} displays`);
```

## Development

This package is part of the AI Capabilities Suite monorepo.

### Build

```bash
npm run build
```

### Test

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- capture
npm test -- security
npm test -- property

# Run with coverage
npm test -- --coverage
```

### Project Structure

```
packages/mcp-screenshot/
├── src/
│   ├── capture/          # Platform-specific capture engines
│   ├── processing/       # Image processing and encoding
│   ├── privacy/          # PII detection and masking
│   ├── security/         # Security policy enforcement
│   ├── storage/          # File operations
│   ├── tools/            # MCP tool implementations
│   ├── interfaces/       # TypeScript interfaces
│   ├── types/            # Type definitions
│   ├── errors/           # Error classes
│   ├── server.ts         # MCP server implementation
│   └── cli.ts            # CLI entry point
├── README.md
├── TESTING.md
└── package.json
```

## Contributing

Contributions are welcome! Please ensure:

- All tests pass (`npm test`)
- Code follows TypeScript best practices
- New features include tests and documentation
- Security considerations are addressed

## License

MIT

## Support

For issues and questions:

- GitHub Issues: [Create an issue](https://github.com/your-org/ai-capabilities-suite/issues)
- Documentation: See TESTING.md for testing guide
- Security: Report security issues privately to <security@example.com>
