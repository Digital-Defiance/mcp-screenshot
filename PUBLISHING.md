# NPM Publishing Guide - MCP ACS Screenshot

This guide covers the complete process for publishing the MCP ACS Screenshot packages to NPM, including setup, manual publishing, and automated workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Manual Publishing](#manual-publishing)
- [Automated Publishing](#automated-publishing)
- [Version Management](#version-management)
- [Publishing Checklist](#publishing-checklist)
- [Troubleshooting](#troubleshooting)
- [Post-Publishing](#post-publishing)

## Prerequisites

Before publishing to NPM, ensure you have:

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/signup)
2. **Organization Access**: Request access to the `@ai-capabilities-suite` organization
3. **Two-Factor Authentication**: Enable 2FA on your NPM account for security
4. **Node.js**: Version 18.0.0 or higher installed
5. **Repository Access**: Write access to the GitHub repository

## Initial Setup

### 1. NPM Account Configuration

#### Create NPM Account

```bash
# If you don't have an account, create one
npm adduser
```

#### Login to NPM

```bash
# Login to your NPM account
npm login

# Verify you're logged in
npm whoami
```

#### Enable Two-Factor Authentication

1. Go to [npmjs.com/settings/profile](https://www.npmjs.com/settings/profile)
2. Navigate to "Two-Factor Authentication"
3. Enable 2FA for "Authorization and Publishing"
4. Save your recovery codes in a secure location

### 2. Generate NPM Access Token

For automated publishing via GitHub Actions, you need an access token:

1. Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Click "Generate New Token" → "Classic Token"
3. Select "Automation" type (for CI/CD)
4. Set permissions:
   - ✅ Read and write packages
   - ✅ Read and write to the registry
5. Copy the token (you won't see it again!)

### 3. Configure GitHub Secrets

Add the NPM token to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste your NPM access token
6. Click "Add secret"

### 4. Verify Package Configuration

Check that `package.json` is properly configured:

```json
{
  "name": "@ai-capabilities-suite/mcp-screenshot",
  "version": "0.0.2",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE",
    "API.md",
    "CONFIGURATION.md",
    "EXAMPLES.md"
  ]
}
```

## Manual Publishing

### Pre-Publishing Steps

1. **Update Version Number**

   ```bash
   # Update version in package.json
   cd packages/mcp-screenshot
   npm version patch  # or minor, or major
   ```

2. **Clean and Build**

   ```bash
   # From repository root
   yarn clean
   yarn install
   yarn build
   ```

3. **Run Tests**

   ```bash
   # Run full test suite
   cd packages/mcp-screenshot
   npm test
   
   # Run E2E tests specifically
   npm test -- --testPathPattern=e2e
   ```

4. **Verify Package Contents**

   ```bash
   # Dry run to see what will be published
   cd packages/mcp-screenshot
   npm pack --dry-run
   
   # Or create actual tarball to inspect
   npm pack
   tar -tzf ai-capabilities-suite-mcp-screenshot-*.tgz
   ```

### Publishing to NPM

#### First-Time Publishing

For the first publish, use the `--access public` flag:

```bash
# From packages/mcp-screenshot
npm publish --access public
```

#### Subsequent Publishing

```bash
# From packages/mcp-screenshot
npm publish
```

#### Publishing with Tags

Use tags for pre-release versions:

```bash
# Beta release
npm publish --tag beta

# Next/canary release
npm publish --tag next

# Latest (default)
npm publish --tag latest
```

### Verify Publication

After publishing, verify the package:

```bash
# Check package info
npm info @ai-capabilities-suite/mcp-screenshot

# Install in a test directory
mkdir test-install && cd test-install
npm init -y
npm install @ai-capabilities-suite/mcp-screenshot

# Test the CLI
npx @ai-capabilities-suite/mcp-screenshot
```

## Automated Publishing

The repository includes a GitHub Actions workflow for automated publishing.

### Workflow Triggers

The workflow can be triggered in two ways:

#### 1. GitHub Release (Recommended)

When you create a GitHub release, the workflow automatically publishes:

```bash
# Create and push a tag
git tag mcp-screenshot-v0.0.2
git push origin mcp-screenshot-v0.0.2

# Then create a release on GitHub:
# 1. Go to Releases → Draft a new release
# 2. Choose the tag (mcp-screenshot-v0.0.2)
# 3. Generate release notes
# 4. Publish release
```

#### 2. Manual Workflow Dispatch

Trigger the workflow manually from GitHub Actions:

1. Go to Actions → "Publish to NPM"
2. Click "Run workflow"
3. Select options:
   - **Package**: Choose "mcp-screenshot"
   - **Tag**: Choose NPM dist-tag (latest, beta, next)
4. Click "Run workflow"

### Workflow Configuration

The workflow performs:

1. ✅ Checkout code
2. ✅ Setup Node.js 20
3. ✅ Install dependencies
4. ✅ Build package
5. ✅ Run tests (including E2E)
6. ✅ Publish to NPM with provenance
7. ✅ Comment on release with install instructions

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** (0.1.0 → 1.0.0): Breaking changes
- **MINOR** (0.0.2 → 0.1.0): New features, backward compatible
- **PATCH** (0.0.2 → 0.0.3): Bug fixes, backward compatible

### Version Update Commands

```bash
# Patch version (0.0.2 → 0.0.3)
npm version patch

# Minor version (0.0.2 → 0.1.0)
npm version minor

# Major version (0.0.2 → 1.0.0)
npm version major

# Pre-release versions
npm version prerelease --preid=beta  # 0.0.2 → 0.0.3-beta.0
npm version prerelease --preid=alpha # 0.0.2 → 0.0.3-alpha.0
```

## Publishing Checklist

Use this checklist before each publish:

### Pre-Publish Checklist

- [ ] All tests passing (`npm test`)
- [ ] E2E tests passing (`npm test -- --testPathPattern=e2e`)
- [ ] Code coverage meets requirements
- [ ] Documentation updated (README, API docs)
- [ ] CHANGELOG.md updated with changes
- [ ] Version number updated in package.json
- [ ] No uncommitted changes (`git status`)
- [ ] On main/master branch
- [ ] Latest code pulled (`git pull`)
- [ ] Dependencies up to date
- [ ] Build successful (`npm run build`)
- [ ] Package contents verified (`npm pack --dry-run`)
- [ ] Platform-specific features tested (Linux, macOS, Windows)

### Post-Publish Checklist

- [ ] Package visible on npmjs.com
- [ ] Installation works (`npm install @ai-capabilities-suite/mcp-screenshot`)
- [ ] CLI executable works
- [ ] Documentation links work
- [ ] GitHub release created (if applicable)
- [ ] Release notes published
- [ ] Announcement made (if major release)

## Troubleshooting

### Common Issues

#### Issue: "You must be logged in to publish packages"

**Solution:**

```bash
npm login
npm whoami  # Verify login
```

#### Issue: "You do not have permission to publish"

**Causes:**

- Not a member of the `@ai-capabilities-suite` organization
- Package name already taken
- 2FA not configured

**Solutions:**

```bash
# Check organization membership
npm org ls @ai-capabilities-suite

# Request access from organization owner
```

#### Issue: "Version already exists"

**Solution:**

```bash
# Increment version
npm version patch

# Or manually edit package.json and update version
```

#### Issue: "npm ERR! 403 Forbidden"

**Causes:**

- Invalid NPM token
- Token expired
- Insufficient permissions

**Solutions:**

1. Generate new NPM token
2. Update GitHub secret `NPM_TOKEN`
3. Verify token has publish permissions

#### Issue: "Native dependencies fail to install"

**Causes:**

- Missing system dependencies (sharp, screenshot-desktop)
- Platform-specific build tools not installed

**Solutions:**

**Linux:**

```bash
# Install build tools
sudo apt-get install build-essential libx11-dev libxext-dev libxrandr-dev

# For sharp
sudo apt-get install libvips-dev
```

**macOS:**

```bash
# Install Xcode Command Line Tools
xcode-select --install

# For sharp (if needed)
brew install vips
```

**Windows:**

```bash
# Install windows-build-tools
npm install --global windows-build-tools
```

#### Issue: "Screenshot capture fails in tests"

**Causes:**

- No display server available (headless environment)
- Insufficient permissions

**Solutions:**

```bash
# Linux - use xvfb for headless testing
xvfb-run npm test

# Or skip E2E tests in CI
npm test -- --testPathIgnorePatterns=e2e
```

### Debugging Failed Publishes

```bash
# Enable verbose logging
npm publish --verbose

# Check package contents
npm pack
tar -tzf *.tgz | less

# Verify package.json
cat package.json | jq .

# Test installation locally
npm install ./ai-capabilities-suite-mcp-screenshot-*.tgz
```

## Post-Publishing

### Verify Installation

Test the published package:

```bash
# Create test directory
mkdir /tmp/test-mcp-screenshot && cd /tmp/test-mcp-screenshot

# Initialize project
npm init -y

# Install published package
npm install @ai-capabilities-suite/mcp-screenshot

# Test CLI
npx @ai-capabilities-suite/mcp-screenshot

# Test programmatic usage
node -e "const mcp = require('@ai-capabilities-suite/mcp-screenshot'); console.log('Success!');"
```

### Update Documentation

After publishing:

1. **Update README badges**:

   ```markdown
   ![npm version](https://img.shields.io/npm/v/@ai-capabilities-suite/mcp-screenshot)
   ![npm downloads](https://img.shields.io/npm/dm/@ai-capabilities-suite/mcp-screenshot)
   ```

2. **Update installation instructions** in README.md

3. **Create GitHub release** with:
   - Version tag (mcp-screenshot-v0.0.2)
   - Release notes
   - Breaking changes (if any)
   - Platform-specific notes

4. **Announce release**:
   - GitHub Discussions
   - Social media
   - Community channels

### Monitor Package Health

After publishing, monitor:

1. **NPM Package Page**:
   - <https://www.npmjs.com/package/@ai-capabilities-suite/mcp-screenshot>

2. **Download Stats**:

   ```bash
   npm info @ai-capabilities-suite/mcp-screenshot
   ```

3. **GitHub Issues**: Watch for bug reports

4. **Security Alerts**:

   ```bash
   npm audit
   ```

## Platform-Specific Considerations

### Linux

- Requires X11 or Wayland
- May need additional permissions for screen capture
- Test on multiple distributions (Ubuntu, Fedora, Arch)

### macOS

- Requires screen recording permissions
- Test on both Intel and Apple Silicon
- Verify code signing if applicable

### Windows

- Test on Windows 10 and 11
- Verify both x64 and ARM64 if supported
- Check Windows Defender compatibility

## Best Practices

### Security

1. **Never commit NPM tokens** to version control
2. **Use automation tokens** for CI/CD
3. **Enable 2FA** on NPM account
4. **Rotate tokens** periodically
5. **Use provenance** for supply chain security

### Quality

1. **Always run tests** before publishing
2. **Test on all supported platforms**
3. **Update documentation** with each release
4. **Follow semantic versioning** strictly
5. **Keep dependencies updated**

### Process

1. **Use feature branches** for development
2. **Create pull requests** for review
3. **Tag releases** in git
4. **Maintain CHANGELOG.md**
5. **Automate where possible**

## Additional Resources

- [NPM Publishing Documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [NPM Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Actions for NPM](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)

## Support

For publishing issues:

1. Check this guide first
2. Review [NPM documentation](https://docs.npmjs.com/)
3. Open an issue on GitHub
4. Contact package maintainers

---

**Last Updated**: 2024
**Maintainer**: Digital Defiance
**Package**: @ai-capabilities-suite/mcp-screenshot
