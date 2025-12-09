# Docker MCP Registry Submission Guide

## Overview

This document provides instructions for submitting the MCP Screenshot server to the Docker MCP Registry.

## Submission Files

The following files are prepared for submission in the `docker-mcp-registry/` directory:

1. **server.yaml** - Server metadata and configuration
2. **tools.json** - Tool definitions and schemas
3. **readme.md** - User documentation and quick start guide

## Docker Image Information

- **Image Name**: `digitaldefiance/mcp-screenshot`
- **Tags**: `latest`, `0.0.2`, `v0.0.2`
- **Registry**: Docker Hub
- **Image URL**: https://hub.docker.com/r/digitaldefiance/mcp-screenshot

## Submission Process

### Option 1: GitHub PR (Recommended)

1. Fork the Docker MCP Registry repository:

   ```bash
   git clone https://github.com/docker/mcp-registry.git
   cd mcp-registry
   ```

2. Create a new directory for your server:

   ```bash
   mkdir -p servers/mcp-screenshot
   ```

3. Copy submission files:

   ```bash
   cp packages/mcp-screenshot/docker-mcp-registry/* servers/mcp-screenshot/
   ```

4. Create a branch and commit:

   ```bash
   git checkout -b add-mcp-screenshot
   git add servers/mcp-screenshot
   git commit -m "Add MCP Screenshot server"
   ```

5. Push and create PR:

   ```bash
   git push origin add-mcp-screenshot
   ```

6. Open a Pull Request on GitHub with:
   - Title: "Add MCP Screenshot Server"
   - Description: Include features, use cases, and testing information

### Option 2: Direct Submission

If the Docker MCP Registry has a web submission form:

1. Navigate to the submission page
2. Fill in the form with:
   - Server Name: MCP Screenshot
   - Docker Image: digitaldefiance/mcp-screenshot:latest
   - Category: Productivity, Development Tools
   - Description: Cross-platform screenshot capture for AI agents
3. Upload the three files from `docker-mcp-registry/`
4. Submit for review

## Verification Checklist

Before submitting, verify:

- [x] Docker image is published and accessible
- [x] Image runs successfully: `docker run -i --rm digitaldefiance/mcp-screenshot:latest`
- [x] All 5 tools are functional
- [x] Documentation is complete and accurate
- [x] Examples work as documented
- [x] Security best practices are followed
- [x] Resource limits are reasonable
- [x] Health checks are configured

## Testing the Submission

Test the Docker image locally before submitting:

```bash
# Pull the image
docker pull digitaldefiance/mcp-screenshot:latest

# Test basic functionality
docker run -i --rm \
  -v $(pwd)/test-screenshots:/app/screenshots \
  digitaldefiance/mcp-screenshot:latest

# Test with configuration
docker run -i --rm \
  -v $(pwd)/config.json:/app/config/config.json:ro \
  -v $(pwd)/test-screenshots:/app/screenshots \
  digitaldefiance/mcp-screenshot:latest
```

## Post-Submission

After submission:

1. Monitor the PR or submission status
2. Respond to any reviewer feedback
3. Update documentation if requested
4. Announce availability once approved

## Support Information

- **GitHub**: https://github.com/digital-defiance/ai-capabilities-suite
- **Issues**: https://github.com/digital-defiance/ai-capabilities-suite/issues
- **Email**: info@digitaldefiance.org
- **Documentation**: https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-screenshot

## Version History

- **v0.0.2** (2024-12-02): Initial Docker MCP Registry submission
  - 5 screenshot tools
  - Cross-platform support
  - PII masking
  - Security policies
  - Comprehensive testing (301 tests passing)

## License

MIT License - See LICENSE file for details
