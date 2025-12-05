---
name: "acs-screenshot"
displayName: "ACS Screenshot"
description: "Visual capture and analysis with PII masking for documentation, UI testing, and accessibility auditing"
keywords:
  [
    "screenshot",
    "screen-capture",
    "visual",
    "ui",
    "testing",
    "documentation",
    "accessibility",
    "pii-masking",
    "image-processing",
  ]
author: "Digital Defiance"
---

# ACS Screenshot Power

## Overview

Professional screenshot capture capabilities for AI agents with multi-format support, PII masking, and security controls. Capture full screens, specific windows, or custom regions with automatic text extraction and privacy protection.

**Key capabilities:**

- Multi-capture modes (full screen, window, region)
- Format support (PNG, JPEG, WebP, BMP)
- PII masking for sensitive information
- Multi-monitor support
- LSP integration with 20 code intelligence features

**VS Code Extension**: `DigitalDefiance.mcp-screenshot`

## Available MCP Servers

### acs-screenshot

**Package:** `@ai-capabilities-suite/mcp-screenshot`
**Connection:** Local MCP server via npx

## Configuration

```json
{
  "mcpServers": {
    "acs-screenshot": {
      "command": "npx",
      "args": ["-y", "@ai-capabilities-suite/mcp-screenshot@latest"]
    }
  }
}
```

## Resources

- [Package on npm](https://www.npmjs.com/package/@ai-capabilities-suite/mcp-screenshot)
- [GitHub Repository](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-screenshot)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=DigitalDefiance.mcp-screenshot)

---

**Package:** `@ai-capabilities-suite/mcp-screenshot`  
**License:** MIT
