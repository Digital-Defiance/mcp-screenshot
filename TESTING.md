# MCP ACS Screenshot Testing Guide

## Test Structure

```
packages/mcp-screenshot/
├── src/
│   ├── capture/
│   │   └── capture-engine.property.spec.ts    # Property-based tests
│   ├── e2e/
│   │   └── screenshot-workflow.e2e.spec.ts    # End-to-end integration tests
│   └── types/
│       └── index.spec.ts                       # Basic unit tests
```

## Test Types

### 1. Property-Based Tests (PBT)

Located in: `src/capture/capture-engine.property.spec.ts`

Uses `fast-check` to test universal properties across many inputs.

**Property 1: Full screen capture dimensions match display resolution**

- Validates that captured images match display resolution
- Tests both primary and multi-display scenarios
- Runs with graceful fallback for missing tools

```bash
npm test -- capture-engine.property.spec.ts
```

### 2. End-to-End Tests

Located in: `src/e2e/screenshot-workflow.e2e.spec.ts`

Tests complete workflows integrating all components:

- Full screen capture workflow
- Region capture workflow
- Window capture workflow
- Image processing workflow
- Security workflow
- Privacy workflow
- Complete end-to-end workflow

```bash
npm test -- screenshot-workflow.e2e.spec.ts
```

### 3. Unit Tests

Located in: `src/types/index.spec.ts`

Basic tests for type definitions and infrastructure.

```bash
npm test -- index.spec.ts
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run specific test file

```bash
npm test -- <filename>
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run with coverage

```bash
npm test -- --coverage
```

## Test Configuration

### Jest Configuration

File: `jest.config.js`

- **Test environment**: Node.js
- **Transform**: SWC for fast TypeScript compilation
- **Test match**: `**/?(*.)+(spec|test).[jt]s?(x)`
- **Coverage directory**: `test-output/jest/coverage`

### SWC Configuration

File: `.spec.swcrc`

Optimized TypeScript compilation for tests.

## Writing Tests

### Property-Based Test Template

```typescript
import * as fc from "fast-check";

describe("Component Property Tests", () => {
  it("should satisfy property X", () => {
    fc.assert(
      fc.property(
        fc.integer(), // arbitrary generator
        (value) => {
          // Test property
          expect(someFunction(value)).toBe(expectedResult);
        }
      ),
      { numRuns: 100 } // Run 100 iterations
    );
  });
});
```

### E2E Test Template

```typescript
describe("Workflow E2E Tests", () => {
  let component: Component;
  let tempDir: string;

  beforeAll(() => {
    // Setup
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-"));
    component = new Component();
  });

  afterAll(() => {
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should complete workflow", async () => {
    try {
      // Test workflow
      const result = await component.doSomething();
      expect(result).toBeDefined();
    } catch (error) {
      // Handle missing tools gracefully
      if (error.message.includes("not found")) {
        console.warn("Tools not available - skipping test");
        return;
      }
      throw error;
    }
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

### Test Behavior in CI

Tests are designed to work in CI environments:

1. **Graceful degradation**: Skip tests when system tools unavailable
2. **No display required**: Handle headless environments
3. **Temporary files**: Auto-cleanup after tests
4. **Fast execution**: Complete in ~4 seconds
5. **Clear output**: Warning messages for skipped tests

## Test Coverage Goals

- **Unit tests**: Core logic and utilities
- **Property tests**: Universal properties and invariants
- **Integration tests**: Component interactions
- **E2E tests**: Complete workflows

## Debugging Tests

### Run single test

```bash
npm test -- -t "test name"
```

### Enable verbose output

```bash
npm test -- --verbose
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **Test isolation**: Each test should be independent
2. **Cleanup**: Always clean up resources in `afterAll`/`afterEach`
3. **Error handling**: Handle missing tools gracefully
4. **Timeouts**: Set appropriate timeouts for async operations
5. **Descriptive names**: Use clear, descriptive test names
6. **Comments**: Document what each test validates

## Platform-Specific Considerations

### Linux

- Requires `grim` (Wayland) or `import` (X11) for screen capture
- Requires `wmctrl` or `swaymsg` for window enumeration
- Tests skip gracefully if tools missing

### macOS

- Uses `screencapture` command
- Uses AppleScript for window enumeration
- Generally available on all macOS systems

### Windows

- Uses PowerShell for capture and enumeration
- Requires Windows Forms assemblies
- May need elevated permissions

## Troubleshooting

### Tests skipping due to missing tools

**Linux (Wayland):**

```bash
sudo apt-get install grim slurp
```

**Linux (X11):**

```bash
sudo apt-get install imagemagick wmctrl
```

**macOS:**
Tools are built-in, no installation needed.

**Windows:**
PowerShell is built-in, no installation needed.

### Tests timing out

Increase timeout in test:

```typescript
it("test name", async () => {
  // test code
}, 60000); // 60 second timeout
```

### Memory issues

Reduce concurrent test execution:

```bash
npm test -- --maxWorkers=2
```

## Contributing

When adding new features:

1. Write property-based tests for universal properties
2. Write e2e tests for complete workflows
3. Ensure tests work in CI environments
4. Update this documentation

## Resources

- [Jest Documentation](https://jestjs.io/)
- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Property-Based Testing Guide](https://hypothesis.works/articles/what-is-property-based-testing/)
