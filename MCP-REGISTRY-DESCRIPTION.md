# MCP Screenshot Server - Registry Description

## Overview

The MCP Screenshot Server is a cross-platform screenshot capture solution designed specifically for AI agents. It provides comprehensive screen capture capabilities with built-in privacy protection, security controls, and multi-format support.

## Key Features

### 🖥️ Cross-Platform Support
- **Linux**: X11 and Wayland support
- **macOS**: Native screencapture integration with Retina display support
- **Windows**: High-DPI display support

### 📸 Multiple Capture Modes
- **Full Screen**: Capture entire displays or specific monitors
- **Window Capture**: Target specific application windows by ID or title
- **Region Capture**: Capture rectangular screen regions with pixel-perfect accuracy

### 🎨 Multi-Format Support
- PNG (lossless compression)
- JPEG (configurable quality)
- WebP (lossy and lossless)
- BMP (uncompressed)

### 🔒 Privacy & Security
- **PII Masking**: Automatic detection and redaction of emails, phone numbers, and credit cards using OCR
- **Window Exclusion**: Automatically exclude password managers and authentication dialogs
- **Path Validation**: Restrict file saves to allowed directories
- **Rate Limiting**: Prevent capture spam with configurable limits
- **Audit Logging**: Track all capture operations for compliance

### 🖼️ Advanced Features
- Multi-monitor support with virtual desktop coordinates
- Window enumeration and filtering
- Display information retrieval
- Base64 encoding for in-memory transfer
- Configurable compression and quality settings
- Frame inclusion/exclusion for window captures

## Use Cases

### Visual Debugging
AI agents can capture screenshots to analyze UI states, identify visual bugs, and provide context-aware debugging assistance.

### Documentation Generation
Automatically capture screenshots for documentation, tutorials, and user guides with consistent formatting.

### Automated Testing
Integrate with test frameworks to capture visual evidence of test execution and failures.

### Screen Monitoring
Monitor application states and user interfaces for quality assurance and support purposes.

### Privacy-Aware Capture
Capture screenshots in sensitive environments with automatic PII masking and window exclusion.

## Tools Provided

### screenshot_capture_full
Capture full screen or specific display with optional PII masking.

**Parameters:**
- `display` (optional): Display ID for multi-monitor setups
- `format`: Image format (png, jpeg, webp, bmp)
- `quality` (optional): Compression quality (1-100)
- `savePath` (optional): File path to save screenshot
- `enablePIIMasking` (optional): Enable PII detection and masking

### screenshot_capture_window
Capture specific application window by ID or title pattern.

**Parameters:**
- `windowId` (optional): Window identifier
- `windowTitle` (optional): Window title pattern
- `includeFrame`: Include window frame and title bar
- `format`: Image format (png, jpeg, webp, bmp)

### screenshot_capture_region
Capture rectangular screen region with coordinate validation.

**Parameters:**
- `x`: X coordinate (pixels)
- `y`: Y coordinate (pixels)
- `width`: Region width (pixels)
- `height`: Region height (pixels)
- `format`: Image format (png, jpeg, webp, bmp)

### screenshot_list_displays
List all connected displays with metadata including resolution, position, and primary indicator.

### screenshot_list_windows
List all visible windows with metadata including title, position, dimensions, and process information.

## Installation

### NPM
```bash
npm install -g @ai-capabilities-suite/mcp-screenshot
```

### Docker
```bash
docker pull digitaldefiance/mcp-screenshot:latest
```

### Kiro Configuration
```json
{
  "mcpServers": {
    "screenshot": {
      "command": "npx",
      "args": ["-y", "@ai-capabilities-suite/mcp-screenshot"]
    }
  }
}
```

## Configuration

### Basic Configuration
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
```json
{
  "mcpServers": {
    "screenshot": {
      "command": "npx",
      "args": [
        "-y",
        "@ai-capabilities-suite/mcp-screenshot",
        "--config=/path/to/security-policy.json"
      ]
    }
  }
}
```

**security-policy.json:**
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

## Example Usage

### Capture Full Screen
```json
{
  "tool": "screenshot_capture_full",
  "arguments": {
    "format": "png",
    "savePath": "/home/user/screenshots/screenshot.png"
  }
}
```

### Capture Window with PII Masking
```json
{
  "tool": "screenshot_capture_window",
  "arguments": {
    "windowTitle": "Chrome",
    "format": "png",
    "includeFrame": false
  }
}
```

### Capture Region
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

## Response Format

All tools return structured JSON responses:

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
      "isPrimary": true
    }
  }
}
```

## Security Features

### Path Validation
Prevents path traversal attacks and restricts file saves to configured directories.

### Rate Limiting
Configurable limits prevent capture spam and resource exhaustion.

### Audit Logging
All capture operations are logged with timestamps and parameters for compliance.

### PII Masking
Automatic detection and redaction of sensitive information using OCR and pattern matching.

### Window Exclusion
Automatically exclude sensitive windows like password managers from captures.

## Performance

- **Fast Capture**: Optimized platform-specific capture engines
- **Efficient Encoding**: Sharp library for fast image processing
- **Memory Efficient**: Streaming for large images
- **Concurrent Captures**: Support for multiple simultaneous captures

## Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0
- Platform-specific dependencies:
  - **Linux**: X11 or Wayland, ImageMagick
  - **macOS**: screencapture (built-in)
  - **Windows**: screenshot-desktop library

## Support & Documentation

- **GitHub**: https://github.com/digital-defiance/ai-capabilities-suite
- **Documentation**: https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-screenshot
- **Issues**: https://github.com/digital-defiance/ai-capabilities-suite/issues
- **Email**: info@digitaldefiance.org

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please see our contributing guidelines in the repository.

## Changelog

### Version 0.0.1 (Initial Release)
- Cross-platform screenshot capture
- Multi-format support (PNG, JPEG, WebP, BMP)
- PII masking with OCR
- Security policies and rate limiting
- Multi-monitor support
- Window and region capture
- Docker support
- Comprehensive documentation

## Tags

`screenshot`, `screen-capture`, `image-processing`, `pii-masking`, `privacy`, `security`, `cross-platform`, `multi-monitor`, `window-capture`, `region-capture`, `ai-agent`, `mcp-server`, `kiro`
