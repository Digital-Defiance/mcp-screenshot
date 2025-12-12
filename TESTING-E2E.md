# MCP ACS Screenshot E2E Testing

This document describes the end-to-end testing strategy for the MCP ACS Screenshot server and VSCode extension.

## Test Files

### 1. `server.e2e.spec.ts` - Comprehensive E2E Tests

Full end-to-end tests that exercise the MCP ACS Screenshot server through the stdio protocol, similar to how real clients would interact with it.

**Test Coverage:**

- MCP Protocol initialization
- Tool discovery (tools/list)
- Display listing
- Window listing
- Full screen capture (base64 and file)
- Region capture with validation
- Window capture by ID and title
- Format support (PNG, JPEG, WebP, BMP)
- PII masking
- Error handling
- Security and privacy features

**Run with:**

```bash
npm test -- server.e2e.spec.ts
```

### 2. `server.minimal.e2e.spec.ts` - Quick Smoke Tests

Minimal smoke tests for quick validation of core functionality.

**Test Coverage:**

- Initialize request
- Tools list
- Display listing
- Full screen capture

**Run with:**

```bash
npm test -- server.minimal.e2e.spec.ts
```

### 3. `server.test.ts` - Unit Tests

Basic unit tests for the server class.

### 4. `server.integration.test.ts` - Integration Tests

Integration tests for tool registration and schema validation.

## Running Tests

### Run All Tests

```bash
cd packages/mcp-screenshot
npm test
```

### Run Only E2E Tests

```bash
npm test -- --testPathPattern=e2e
```

### Run Specific Test File

```bash
npm test -- server.e2e.spec.ts
```

### Run with Coverage

```bash
npm test -- --coverage
```

## Test Architecture

The E2E tests follow the same pattern as `mcp-debugger-server`:

1. **Server Startup**: Spawn the MCP server as a child process with stdio transport
2. **JSON-RPC Communication**: Send JSON-RPC 2.0 requests over stdin/stdout
3. **Response Validation**: Parse and validate responses
4. **Cleanup**: Properly shutdown server and cleanup resources

## VSCode Extension Testing

The VSCode extension can be tested manually or through VSCode's test framework:

### Manual Testing

1. Open the extension in VSCode
2. Press F5 to launch Extension Development Host
3. Use Command Palette to test commands:
   - `MCP ACS Screenshot: Capture Full Screen`
   - `MCP ACS Screenshot: Capture Window`
   - `MCP ACS Screenshot: Capture Region`
   - `MCP ACS Screenshot: List Displays`
   - `MCP ACS Screenshot: List Windows`

### Automated Testing

VSCode extension tests would be added in `packages/vscode-mcp-screenshot/src/test/` following VSCode's testing guidelines.

## CI/CD Integration

The E2E tests are designed to run in CI/CD pipelines:

```yaml
- name: Run E2E Tests
  run: |
    cd packages/mcp-screenshot
    npm test -- --testPathPattern=e2e
```

## Platform-Specific Considerations

### Linux

- Requires X11 or Wayland display server
- May need `xvfb` for headless testing

### macOS

- Requires screen recording permissions
- May need accessibility permissions

### Windows

- Works with standard Windows API
- No special permissions required

## Test Data

Tests use temporary directories for file operations:

- Created in `os.tmpdir()` with prefix `mcp-screenshot-test-`
- Automatically cleaned up after tests complete

## Debugging Tests

Enable verbose logging:

```bash
DEBUG=* npm test -- server.e2e.spec.ts
```

View server stderr output:

- Tests log server stderr to console
- Check for server startup issues or runtime errors

## Known Issues

1. **Display Server Required**: E2E tests require an active display server
2. **Permissions**: Some platforms may require permissions for screen capture
3. **Timing**: Tests include appropriate delays for async operations

## Future Improvements

- [ ] Add VSCode extension automated tests
- [ ] Add performance benchmarks
- [ ] Add cross-platform CI testing
- [ ] Add visual regression testing
- [ ] Add load testing for concurrent captures
