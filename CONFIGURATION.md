# MCP ACS Screenshot - Configuration Guide

This guide provides detailed configuration examples for the MCP ACS Screenshot server, including security policies, MCP client configurations, and environment variable setups.

## Table of Contents

- [Security Policy Configuration](#security-policy-configuration)
- [MCP Client Configuration](#mcp-client-configuration)
- [Environment Variables](#environment-variables)
- [Advanced Configuration](#advanced-configuration)

## Security Policy Configuration

### Basic Security Policy

Create a `security-policy.json` file with basic security settings:

```json
{
  "allowedDirectories": [
    "/home/user/screenshots",
    "/tmp/screenshots"
  ],
  "blockedWindowPatterns": [],
  "maxCapturesPerMinute": 60,
  "enableAuditLog": true
}
```

### Strict Security Policy

For production environments with strict security requirements:

```json
{
  "allowedDirectories": [
    "/var/app/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*[Pp]assword.*",
    ".*[Aa]uth.*",
    ".*1Password.*",
    ".*LastPass.*",
    ".*Bitwarden.*",
    ".*KeePass.*",
    ".*Dashlane.*",
    ".*[Cc]redential.*",
    ".*[Ll]ogin.*",
    ".*[Ss]ecure.*",
    ".*Banking.*",
    ".*Wallet.*"
  ],
  "maxCapturesPerMinute": 30,
  "enableAuditLog": true
}
```

### Development Security Policy

For development environments with relaxed restrictions:

```json
{
  "allowedDirectories": [
    "/home/user/screenshots",
    "/home/user/projects",
    "/tmp",
    "/var/tmp"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*1Password.*"
  ],
  "maxCapturesPerMinute": 120,
  "enableAuditLog": false
}
```

### Multi-User Security Policy

For shared systems with multiple users:

```json
{
  "allowedDirectories": [
    "/shared/screenshots",
    "/home/${USER}/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*[Pp]assword.*",
    ".*[Aa]uth.*",
    ".*Private.*",
    ".*Confidential.*"
  ],
  "maxCapturesPerMinute": 45,
  "enableAuditLog": true
}
```

### Enterprise Security Policy

For enterprise deployments with comprehensive security:

```json
{
  "allowedDirectories": [
    "/opt/enterprise/screenshots",
    "/var/log/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*[Pp]assword.*",
    ".*[Aa]uth.*",
    ".*[Cc]redential.*",
    ".*[Ll]ogin.*",
    ".*[Ss]ecure.*",
    ".*VPN.*",
    ".*SSH.*",
    ".*Terminal.*",
    ".*Console.*",
    ".*Admin.*",
    ".*Root.*",
    ".*Sudo.*",
    ".*Banking.*",
    ".*Finance.*",
    ".*Payment.*",
    ".*Credit.*",
    ".*SSN.*",
    ".*Tax.*",
    ".*Medical.*",
    ".*Health.*",
    ".*Legal.*",
    ".*Attorney.*",
    ".*Confidential.*",
    ".*Private.*",
    ".*Secret.*"
  ],
  "maxCapturesPerMinute": 20,
  "enableAuditLog": true
}
```

## MCP Client Configuration

### Kiro IDE Configuration

Add to `~/.kiro/settings/mcp.json` or `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "node",
      "args": [
        "/path/to/mcp-screenshot/dist/cli.js"
      ],
      "env": {
        "SCREENSHOT_ALLOWED_DIRS": "/home/user/screenshots,/tmp",
        "SCREENSHOT_MAX_CAPTURES_PER_MIN": "60",
        "SCREENSHOT_ENABLE_AUDIT_LOG": "true"
      }
    }
  }
}
```

### Kiro IDE with Security Policy File

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "node",
      "args": [
        "/path/to/mcp-screenshot/dist/cli.js",
        "--policy",
        "/path/to/security-policy.json"
      ]
    }
  }
}
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "screenshot": {
      "command": "node",
      "args": [
        "/path/to/mcp-screenshot/dist/cli.js"
      ],
      "env": {
        "SCREENSHOT_ALLOWED_DIRS": "/Users/username/screenshots",
        "SCREENSHOT_MAX_CAPTURES_PER_MIN": "60"
      }
    }
  }
}
```

### VS Code Configuration

Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "screenshot": {
      "command": "node",
      "args": [
        "${workspaceFolder}/node_modules/@ai-capabilities-suite/mcp-screenshot/dist/cli.js"
      ],
      "env": {
        "SCREENSHOT_ALLOWED_DIRS": "${workspaceFolder}/screenshots",
        "SCREENSHOT_MAX_CAPTURES_PER_MIN": "60"
      }
    }
  }
}
```

### Docker Configuration

Using Docker Compose (`docker-compose.yml`):

```yaml
version: '3.8'

services:
  mcp-screenshot:
    image: ai-capabilities-suite/mcp-screenshot:latest
    volumes:
      - ./screenshots:/screenshots
      - ./security-policy.json:/app/security-policy.json:ro
    environment:
      - SCREENSHOT_ALLOWED_DIRS=/screenshots
      - SCREENSHOT_MAX_CAPTURES_PER_MIN=60
      - SCREENSHOT_ENABLE_AUDIT_LOG=true
    stdin_open: true
    tty: true
```

## Environment Variables

### Complete Environment Variable Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SCREENSHOT_ALLOWED_DIRS` | string | Current directory | Comma-separated list of allowed directories |
| `SCREENSHOT_MAX_CAPTURES_PER_MIN` | number | 60 | Maximum captures per minute per agent |
| `SCREENSHOT_ENABLE_AUDIT_LOG` | boolean | true | Enable audit logging to stdout |
| `SCREENSHOT_BLOCKED_WINDOWS` | string | Empty | Comma-separated window title patterns to exclude |
| `SCREENSHOT_DEFAULT_FORMAT` | string | png | Default image format (png, jpeg, webp, bmp) |
| `SCREENSHOT_DEFAULT_QUALITY` | number | 90 | Default quality for lossy formats (1-100) |
| `SCREENSHOT_ENABLE_PII_MASKING` | boolean | false | Enable PII masking by default |
| `SCREENSHOT_TESSERACT_LANG` | string | eng | Tesseract OCR language for PII detection |

### Example .env File

Create a `.env` file in your project root:

```bash
# Allowed directories for saving screenshots
SCREENSHOT_ALLOWED_DIRS=/home/user/screenshots,/tmp/screenshots

# Rate limiting
SCREENSHOT_MAX_CAPTURES_PER_MIN=60

# Audit logging
SCREENSHOT_ENABLE_AUDIT_LOG=true

# Blocked window patterns (comma-separated)
SCREENSHOT_BLOCKED_WINDOWS=.*Password.*,.*1Password.*,.*LastPass.*

# Default settings
SCREENSHOT_DEFAULT_FORMAT=png
SCREENSHOT_DEFAULT_QUALITY=90

# PII masking
SCREENSHOT_ENABLE_PII_MASKING=false
SCREENSHOT_TESSERACT_LANG=eng
```

### Platform-Specific Environment Variables

**Linux (X11):**

```bash
export DISPLAY=:0
export SCREENSHOT_ALLOWED_DIRS=/home/user/screenshots
```

**Linux (Wayland):**

```bash
export WAYLAND_DISPLAY=wayland-0
export SCREENSHOT_ALLOWED_DIRS=/home/user/screenshots
```

**macOS:**

```bash
export SCREENSHOT_ALLOWED_DIRS=/Users/username/screenshots
```

**Windows (PowerShell):**

```powershell
$env:SCREENSHOT_ALLOWED_DIRS="C:\Users\username\screenshots"
$env:SCREENSHOT_MAX_CAPTURES_PER_MIN="60"
```

## Advanced Configuration

### Rate Limiting Configuration

#### Conservative Rate Limiting (High Security)

```json
{
  "maxCapturesPerMinute": 10,
  "enableAuditLog": true
}
```

#### Standard Rate Limiting (Balanced)

```json
{
  "maxCapturesPerMinute": 60,
  "enableAuditLog": true
}
```

#### Permissive Rate Limiting (Development)

```json
{
  "maxCapturesPerMinute": 300,
  "enableAuditLog": false
}
```

### Allowed Directory Configuration

#### Single Directory

```json
{
  "allowedDirectories": [
    "/home/user/screenshots"
  ]
}
```

#### Multiple Directories

```json
{
  "allowedDirectories": [
    "/home/user/screenshots",
    "/home/user/projects/app/screenshots",
    "/tmp/screenshots"
  ]
}
```

#### Workspace-Relative Directories

```json
{
  "allowedDirectories": [
    "${WORKSPACE}/screenshots",
    "${WORKSPACE}/docs/images",
    "/tmp"
  ]
}
```

#### User-Specific Directories

```json
{
  "allowedDirectories": [
    "${HOME}/screenshots",
    "${HOME}/Documents/screenshots",
    "/tmp/${USER}"
  ]
}
```

### Window Exclusion Patterns

#### Basic Password Manager Exclusion

```json
{
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*1Password.*",
    ".*LastPass.*",
    ".*Bitwarden.*"
  ]
}
```

#### Comprehensive Security Application Exclusion

```json
{
  "blockedWindowPatterns": [
    ".*[Pp]assword.*",
    ".*[Aa]uth.*",
    ".*[Cc]redential.*",
    ".*[Ll]ogin.*",
    ".*1Password.*",
    ".*LastPass.*",
    ".*Bitwarden.*",
    ".*KeePass.*",
    ".*Dashlane.*",
    ".*VPN.*",
    ".*SSH.*",
    ".*Terminal.*",
    ".*Console.*"
  ]
}
```

#### Financial Application Exclusion

```json
{
  "blockedWindowPatterns": [
    ".*Banking.*",
    ".*Finance.*",
    ".*Payment.*",
    ".*Credit.*",
    ".*Wallet.*",
    ".*PayPal.*",
    ".*Stripe.*",
    ".*Venmo.*"
  ]
}
```

#### Healthcare Application Exclusion

```json
{
  "blockedWindowPatterns": [
    ".*Medical.*",
    ".*Health.*",
    ".*Patient.*",
    ".*HIPAA.*",
    ".*PHI.*"
  ]
}
```

### Audit Logging Configuration

#### Enable Audit Logging with Custom Format

```typescript
import { MCPScreenshotServer } from '@ai-capabilities-suite/mcp-screenshot';

const server = new MCPScreenshotServer({
  enableAuditLog: true,
  allowedDirectories: ['/home/user/screenshots'],
  maxCapturesPerMinute: 60
});

// Audit logs are written to stdout in JSON format:
// {
//   "timestamp": "2024-12-01T10:30:00.000Z",
//   "operation": "screenshot_capture_full",
//   "params": { "format": "png", "savePath": "/home/user/screenshots/test.png" },
//   "result": "success"
// }
```

#### Redirect Audit Logs to File

```bash
node dist/cli.js 2> audit.log
```

#### Parse Audit Logs

```bash
# Filter successful captures
cat audit.log | jq 'select(.result == "success")'

# Count captures by operation
cat audit.log | jq -r '.operation' | sort | uniq -c

# Find captures with errors
cat audit.log | jq 'select(.result == "error")'
```

### Multi-Environment Configuration

#### Development Environment

```json
{
  "allowedDirectories": [
    "/home/user/dev/screenshots",
    "/tmp"
  ],
  "blockedWindowPatterns": [
    ".*Password.*"
  ],
  "maxCapturesPerMinute": 120,
  "enableAuditLog": false
}
```

#### Staging Environment

```json
{
  "allowedDirectories": [
    "/var/app/staging/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*Auth.*",
    ".*Credential.*"
  ],
  "maxCapturesPerMinute": 60,
  "enableAuditLog": true
}
```

#### Production Environment

```json
{
  "allowedDirectories": [
    "/var/app/production/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*Auth.*",
    ".*Credential.*",
    ".*Login.*",
    ".*Secure.*",
    ".*Banking.*",
    ".*Finance.*",
    ".*Payment.*",
    ".*Medical.*",
    ".*Confidential.*",
    ".*Private.*"
  ],
  "maxCapturesPerMinute": 30,
  "enableAuditLog": true
}
```

## Configuration Best Practices

### Security Best Practices

1. **Principle of Least Privilege**: Only allow directories that are absolutely necessary
2. **Block Sensitive Windows**: Always block password managers and authentication dialogs
3. **Enable Audit Logging**: Keep audit logs for security monitoring and compliance
4. **Rate Limiting**: Set appropriate rate limits to prevent abuse
5. **Regular Review**: Periodically review and update security policies

### Performance Best Practices

1. **Limit Allowed Directories**: Fewer directories = faster path validation
2. **Optimize Window Patterns**: Use specific patterns instead of broad wildcards
3. **Adjust Rate Limits**: Set rate limits based on expected usage patterns
4. **Disable Audit Logging**: In development, disable audit logging for better performance

### Operational Best Practices

1. **Environment-Specific Configs**: Use different configurations for dev/staging/production
2. **Version Control**: Store security policies in version control (excluding secrets)
3. **Documentation**: Document why specific patterns are blocked
4. **Testing**: Test security policies before deploying to production
5. **Monitoring**: Monitor audit logs for suspicious activity

## Troubleshooting Configuration

### Common Configuration Issues

**Issue:** `INVALID_PATH` errors despite correct configuration

**Solution:** Ensure paths are absolute and properly resolved:

```json
{
  "allowedDirectories": [
    "/home/user/screenshots"  // ✓ Absolute path
    // NOT: "~/screenshots"   // ✗ Tilde not expanded
    // NOT: "./screenshots"   // ✗ Relative path
  ]
}
```

**Issue:** Window exclusion patterns not working

**Solution:** Use proper regex syntax:

```json
{
  "blockedWindowPatterns": [
    ".*Password.*"  // ✓ Matches any window with "Password"
    // NOT: "*Password*"  // ✗ Shell glob, not regex
  ]
}
```

**Issue:** Rate limiting too strict

**Solution:** Adjust based on actual usage:

```json
{
  "maxCapturesPerMinute": 120  // Increase for high-frequency use
}
```

**Issue:** Environment variables not being read

**Solution:** Ensure proper format and export:

```bash
export SCREENSHOT_ALLOWED_DIRS="/path1,/path2"  # ✓ Comma-separated
# NOT: SCREENSHOT_ALLOWED_DIRS=/path1:/path2   # ✗ Colon-separated
```

## Examples by Use Case

### Use Case: AI Agent Development

```json
{
  "allowedDirectories": [
    "/home/user/ai-projects/screenshots",
    "/tmp"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*1Password.*"
  ],
  "maxCapturesPerMinute": 120,
  "enableAuditLog": false
}
```

### Use Case: Automated Testing

```json
{
  "allowedDirectories": [
    "/var/test/screenshots",
    "/tmp/test-results"
  ],
  "blockedWindowPatterns": [],
  "maxCapturesPerMinute": 300,
  "enableAuditLog": true
}
```

### Use Case: Documentation Generation

```json
{
  "allowedDirectories": [
    "/home/user/docs/images",
    "/home/user/projects/docs/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*Private.*"
  ],
  "maxCapturesPerMinute": 60,
  "enableAuditLog": false
}
```

### Use Case: Security Monitoring

```json
{
  "allowedDirectories": [
    "/var/log/security/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*Auth.*",
    ".*Credential.*"
  ],
  "maxCapturesPerMinute": 10,
  "enableAuditLog": true
}
```

### Use Case: Customer Support

```json
{
  "allowedDirectories": [
    "/var/support/screenshots"
  ],
  "blockedWindowPatterns": [
    ".*Password.*",
    ".*Auth.*",
    ".*Banking.*",
    ".*Payment.*",
    ".*Credit.*",
    ".*SSN.*",
    ".*Medical.*"
  ],
  "maxCapturesPerMinute": 45,
  "enableAuditLog": true
}
```

## See Also

- [README.md](README.md) - Main documentation
- [TESTING.md](TESTING.md) - Testing guide
- [Security Policy Interface](src/types/index.ts) - TypeScript types
