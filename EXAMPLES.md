# MCP ACS Screenshot - Usage Examples

This document provides comprehensive examples for using the MCP ACS Screenshot server with AI agents.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Advanced Examples](#advanced-examples)
- [Security Configuration](#security-configuration)
- [Docker Usage](#docker-usage)

## Installation

### NPM Installation

```bash
# Global installation
npm install -g @ai-capabilities-suite/mcp-screenshot

# Local installation
npm install @ai-capabilities-suite/mcp-screenshot
```

### Docker Installation

```bash
# Pull from Docker Hub
docker pull digitaldefiance/mcp-screenshot:latest

# Pull from GitHub Container Registry
docker pull ghcr.io/digital-defiance/mcp-screenshot:latest
```

## Configuration

### Kiro Configuration

Add to your `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "npx",
      "args": ["-y", "@ai-capabilities-suite/mcp-screenshot"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### With Security Policy

Create a `screenshot-policy.json`:

```json
{
  "securityPolicy": {
    "allowedDirectories": [
      "/home/user/screenshots",
      "/tmp/screenshots"
    ],
    "maxCapturesPerMinute": 10,
    "enableAuditLog": true
  },
  "excludedWindowPatterns": [
    ".*password.*",
    ".*1Password.*",
    ".*LastPass.*",
    ".*Bitwarden.*"
  ]
}
```

Then configure:

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "npx",
      "args": [
        "-y",
        "@ai-capabilities-suite/mcp-screenshot",
        "--config=/path/to/screenshot-policy.json"
      ]
    }
  }
}
```

## Basic Usage

### Example 1: Capture Full Screen

**User Prompt:**
> "Take a screenshot of my entire screen and save it as screenshot.png"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "png",
    "savePath": "/home/user/screenshots/screenshot.png"
  }
}
```

**Response:**

```json
{
  "status": "success",
  "filePath": "/home/user/screenshots/screenshot.png",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "png",
    "fileSize": 245678,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "display": {
      "id": "0",
      "name": "Primary Display",
      "resolution": { "width": 1920, "height": 1080 },
      "position": { "x": 0, "y": 0 },
      "isPrimary": true
    }
  }
}
```

### Example 2: Capture Specific Window

**User Prompt:**
> "Capture a screenshot of my VS Code window"

**AI Agent Actions:**

1. First, list windows:

```json
{
  "tool": "screenshot_list_windows",
  "arguments": {}
}
```

2. Then capture the VS Code window:

```json
{
  "tool": "screenshot_capture_window",
  "arguments": {
    "windowTitle": "Visual Studio Code",
    "format": "png",
    "includeFrame": false
  }
}
```

### Example 3: Capture Region

**User Prompt:**
> "Capture the top-left corner of my screen, 800x600 pixels"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_region",
  "arguments": {
    "x": 0,
    "y": 0,
    "width": 800,
    "height": 600,
    "format": "png"
  }
}
```

## Advanced Examples

### Example 4: High-Quality JPEG with Compression

**User Prompt:**
> "Take a high-quality screenshot and save it as a JPEG with 90% quality"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "jpeg",
    "quality": 90,
    "savePath": "/home/user/screenshots/high-quality.jpg"
  }
}
```

### Example 5: Screenshot with PII Masking

**User Prompt:**
> "Take a screenshot but mask any sensitive information like emails or phone numbers"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "png",
    "enablePIIMasking": true,
    "savePath": "/home/user/screenshots/masked-screenshot.png"
  }
}
```

**Response with Masking Stats:**

```json
{
  "status": "success",
  "filePath": "/home/user/screenshots/masked-screenshot.png",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "png",
    "fileSize": 256789,
    "timestamp": "2024-01-15T10:35:00.000Z",
    "piiMasking": {
      "emailsRedacted": 2,
      "phonesRedacted": 1,
      "creditCardsRedacted": 0,
      "customPatternsRedacted": 0
    }
  }
}
```

### Example 6: Multi-Monitor Setup

**User Prompt:**
> "Show me all my displays and then capture the secondary monitor"

**AI Agent Actions:**

1. List displays:

```json
{
  "tool": "screenshot_list_displays",
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
      "resolution": { "width": 2560, "height": 1440 },
      "position": { "x": 1920, "y": 0 },
      "isPrimary": false
    }
  ]
}
```

2. Capture secondary display:

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "display": "1",
    "format": "png",
    "savePath": "/home/user/screenshots/secondary-display.png"
  }
}
```

### Example 7: Base64 Encoding (No File Save)

**User Prompt:**
> "Take a screenshot and return it as base64 data"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "png"
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...(base64 data)...CYII=",
  "mimeType": "image/png",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "png",
    "fileSize": 245678,
    "timestamp": "2024-01-15T10:40:00.000Z"
  }
}
```

### Example 8: Window Capture with Frame

**User Prompt:**
> "Capture my browser window including the title bar and borders"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_window",
  "arguments": {
    "windowTitle": "Chrome",
    "includeFrame": true,
    "format": "png"
  }
}
```

### Example 9: WebP Format for Smaller File Size

**User Prompt:**
> "Take a screenshot in WebP format to save space"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "webp",
    "quality": 80,
    "savePath": "/home/user/screenshots/compressed.webp"
  }
}
```

### Example 10: Capture Specific Region on Secondary Monitor

**User Prompt:**
> "Capture a 1000x800 region starting at position (2000, 100)"

**AI Agent Action:**

```json
{
  "tool": "screenshot_capture_region",
  "arguments": {
    "x": 2000,
    "y": 100,
    "width": 1000,
    "height": 800,
    "format": "png"
  }
}
```

## Security Configuration

### Example 11: Restricted Directory Access

Create `security-policy.json`:

```json
{
  "securityPolicy": {
    "allowedDirectories": [
      "/home/user/screenshots",
      "/tmp/screenshots"
    ],
    "maxCapturesPerMinute": 5,
    "enableAuditLog": true
  }
}
```

**Attempting to save outside allowed directories:**

```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "png",
    "savePath": "/etc/screenshot.png"
  }
}
```

**Error Response:**

```json
{
  "status": "error",
  "code": "INVALID_PATH",
  "message": "Path outside allowed directories",
  "details": {
    "requestedPath": "/etc/screenshot.png",
    "allowedDirectories": [
      "/home/user/screenshots",
      "/tmp/screenshots"
    ]
  }
}
```

### Example 12: Rate Limiting

**Exceeding rate limit:**

After 5 captures in one minute:

```json
{
  "status": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Maximum captures per minute exceeded",
  "details": {
    "limit": 5,
    "resetTime": "2024-01-15T10:46:00.000Z"
  }
}
```

## Docker Usage

### Example 13: Running with Docker

```bash
# Create directories
mkdir -p ~/screenshots ~/screenshot-config

# Create config file
cat > ~/screenshot-config/config.json << EOF
{
  "securityPolicy": {
    "allowedDirectories": ["/app/screenshots"],
    "maxCapturesPerMinute": 10,
    "enableAuditLog": true
  }
}
EOF

# Run container
docker run -d \
  --name mcp-screenshot \
  -v ~/screenshots:/app/screenshots \
  -v ~/screenshot-config:/app/config:ro \
  digitaldefiance/mcp-screenshot:latest \
  node dist/src/cli.js --config=/app/config/config.json
```

### Example 14: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-screenshot:
    image: digitaldefiance/mcp-screenshot:latest
    container_name: mcp-screenshot
    volumes:
      - ./screenshots:/app/screenshots
      - ./config.json:/app/config/config.json:ro
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Run:

```bash
docker-compose up -d
```

## Error Handling Examples

### Example 15: Window Not Found

```json
{
  "status": "error",
  "code": "WINDOW_NOT_FOUND",
  "message": "Window not found",
  "details": {
    "searchCriteria": {
      "windowTitle": "NonExistentApp"
    },
    "availableWindows": [
      "Visual Studio Code",
      "Chrome",
      "Terminal"
    ]
  }
}
```

### Example 16: Invalid Region

```json
{
  "status": "error",
  "code": "INVALID_REGION",
  "message": "Invalid region parameters",
  "details": {
    "reason": "Width must be positive",
    "provided": {
      "x": 0,
      "y": 0,
      "width": -100,
      "height": 600
    }
  }
}
```

## Integration Examples

### Example 17: Kiro Agent Workflow

```typescript
// AI agent workflow for visual debugging
async function debugUIIssue() {
  // 1. List windows to find the application
  const windows = await callTool('screenshot_list_windows', {});
  
  // 2. Capture the problematic window
  const screenshot = await callTool('screenshot_capture_window', {
    windowTitle: 'MyApp',
    format: 'png',
    savePath: '/tmp/debug-screenshot.png'
  });
  
  // 3. Analyze the screenshot
  // (AI agent can now see the visual state)
  
  return screenshot;
}
```

### Example 18: Automated Testing

```typescript
// Capture screenshots during test execution
async function captureTestScreenshot(testName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-${testName}-${timestamp}.png`;
  
  return await callTool('screenshot_capture_full', {
    format: 'png',
    savePath: `/tmp/test-screenshots/${filename}`
  });
}
```

## Best Practices

1. **Use appropriate formats:**
   - PNG for lossless quality (UI screenshots, text)
   - JPEG for photos and complex images
   - WebP for best compression with good quality

2. **Enable PII masking for sensitive environments:**
   - Always use when capturing screenshots that might contain personal data
   - Configure custom patterns for domain-specific sensitive data

3. **Configure security policies:**
   - Restrict allowed directories
   - Set reasonable rate limits
   - Enable audit logging for compliance

4. **Handle errors gracefully:**
   - Check for window existence before capture
   - Validate region boundaries
   - Handle rate limit errors with retry logic

5. **Optimize file sizes:**
   - Use quality parameter for lossy formats
   - Choose appropriate format for content type
   - Consider base64 encoding for small images

## Troubleshooting

### Permission Errors

If you encounter permission errors on Linux:

```bash
# Ensure X11 access
xhost +local:

# Or run with proper display
DISPLAY=:0 mcp-screenshot
```

### macOS Screen Recording Permission

On macOS, grant screen recording permission:

1. System Preferences → Security & Privacy → Privacy
2. Select "Screen Recording"
3. Add Terminal or your application

### Windows High-DPI Issues

For high-DPI displays on Windows, ensure proper scaling:

```json
{
  "env": {
    "NODE_ENV": "production",
    "ELECTRON_ENABLE_LOGGING": "1"
  }
}
```

## Support

For issues, questions, or contributions:

- GitHub: <https://github.com/digital-defiance/ai-capabilities-suite>
- Issues: <https://github.com/digital-defiance/ai-capabilities-suite/issues>
- Email: <info@digitaldefiance.org>
