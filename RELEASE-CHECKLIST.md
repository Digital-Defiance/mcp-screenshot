# MCP Screenshot v1.0.0 Release Checklist

## Pre-Release

- [x] Version bumped to 1.0.0 in package.json
- [x] All version references synced (run `npm run sync-versions -- screenshot` or `npx ts-node scripts/sync-versions.ts screenshot`)
- [x] All tests passing (252 tests)
- [x] VSCode extension tests passing (34 tests)
- [x] Code built successfully
- [x] Changelog updated (if applicable)

## Release Steps

### 1. NPM Package

```bash
cd packages/mcp-screenshot
npm run build
npm test
npm publish --access public
```

**Verify**: https://www.npmjs.com/package/@ai-capabilities-suite/mcp-screenshot

### 2. Docker Image

```bash
# From repo root
./packages/mcp-screenshot/docker-build-push.sh --push
```

**Verify**: https://hub.docker.com/r/digidefiance/mcp-screenshot/tags

### 3. VSCode Extension

```bash
cd packages/vscode-mcp-screenshot
npm run compile
npm run package
npm run publish
```

**Verify**: https://marketplace.visualstudio.com/items?itemName=DigitalDefiance.mcp-screenshot

### 4. Git Tag and GitHub Release

```bash
# From repo root
git add -A
git commit -m "Release mcp-screenshot v1.0.0"
git tag mcp-screenshot-v1.0.0
git push origin main
git push origin mcp-screenshot-v1.0.0
```

Then create GitHub release:

1. Go to https://github.com/digital-defiance/ai-capabilities-suite/releases/new
2. Tag: `mcp-screenshot-v1.0.0`
3. Title: `MCP Screenshot v1.0.0`
4. Description: Use release notes template below

## Release Notes Template

```markdown
# MCP Screenshot v1.0.0

## 🎉 What's New

- Fixed VSCode extension E2E tests (all 34 tests passing)
- Updated sync-versions.js to properly sync all screenshot files
- Improved Docker MCP Registry submission files
- Enhanced version management across all artifacts

## ✅ Quality Metrics

- **MCP Server Tests**: 252/252 passing (100%)
- **VSCode Extension Tests**: 34/34 passing (100%)
- **Total Tests**: 286/286 passing (100%)

## 📦 Installation

### NPM

```bash
npm install -g @ai-capabilities-suite/mcp-screenshot@1.0.0
```
```

### Docker

```bash
docker pull digidefiance/mcp-screenshot:1.0.0
```

### VSCode Extension

Search "MCP Screenshot" in VS Code Extensions

## 🔗 Links

- NPM: https://www.npmjs.com/package/@ai-capabilities-suite/mcp-screenshot
- Docker Hub: https://hub.docker.com/r/digidefiance/mcp-screenshot
- VSCode Marketplace: https://marketplace.visualstudio.com/items?itemName=DigitalDefiance.mcp-screenshot
- Documentation: https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-screenshot

## 📝 Full Changelog

**Fixed:**

- VSCode extension configuration tests now properly re-fetch config after updates
- Version sync script now updates all screenshot package files

**Improved:**

- Docker MCP Registry submission files with correct image names
- Version management automation

**Full Changelog**: https://github.com/digital-defiance/ai-capabilities-suite/compare/mcp-screenshot-v0.0.2...mcp-screenshot-v1.0.0
```

## Post-Release

- [ ] Verify NPM package is accessible
- [ ] Verify Docker image is accessible
- [ ] Verify VSCode extension is published
- [ ] Create GitHub release with notes
- [ ] Update main README if needed
- [ ] Submit to Docker MCP Registry (if not done)
- [ ] Submit to MCP Registry (if not done)
- [ ] Announce release (optional)

## Quick Release Command

For automated release (interactive):
```bash
cd packages/mcp-screenshot
./release.sh
```

## Manual Release Commands

If you prefer to run each step manually:

```bash
# 1. Build and test
cd packages/mcp-screenshot
npm run build && npm test

# 2. Publish NPM
npm publish --access public

# 3. Build and push Docker
cd ../..
./packages/mcp-screenshot/docker-build-push.sh --push

# 4. Build and publish VSCode extension
cd packages/vscode-mcp-screenshot
npm run compile && npm run package && npm run publish

# 5. Tag and push
cd ../..
git add -A
git commit -m "Release mcp-screenshot v1.0.0"
git tag mcp-screenshot-v1.0.0
git push origin main
git push origin mcp-screenshot-v1.0.0
```

## Troubleshooting

### NPM Publish Fails

- Ensure you're logged in: `npm login`
- Check version doesn't already exist
- Verify package.json version is correct

### Docker Push Fails

- Ensure you're logged in: `docker login`
- Check Docker Hub credentials
- Verify image name is correct

### VSCode Publish Fails

- Ensure you're logged in: `vsce login DigitalDefiance`
- Check Personal Access Token is valid
- Verify extension version is incremented

### Git Push Fails

- Ensure you have push permissions
- Check if tag already exists: `git tag -l`
- Delete existing tag if needed: `git tag -d mcp-screenshot-v1.0.0`

## Version History

- **v1.0.0** - Current release
- **v0.0.2** - Initial production release
- **v0.0.1** - Beta release
