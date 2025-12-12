#!/bin/bash
set -e

# MCP ACS Screenshot Release Script
# Automates the complete release process for all platforms

VERSION=$(node -p "require('./package.json').version")

echo "🚀 Starting MCP ACS Screenshot v${VERSION} Release Process"
echo "=================================================="
echo ""

# Step 1: Build
echo "📦 Step 1: Building package..."
npm run build
echo "✅ Build complete"
echo ""

# Step 2: Run tests
echo "🧪 Step 2: Running tests..."
npm run test:unit
echo "✅ Tests passed"
echo ""

# Step 3: Publish to NPM
echo "📤 Step 3: Publishing to NPM..."
read -p "Publish to NPM? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm publish --access public
    echo "✅ Published to NPM"
else
    echo "⏭️  Skipped NPM publish"
fi
echo ""

# Step 4: Build and push Docker image
echo "🐳 Step 4: Building and pushing Docker image..."
read -p "Build and push Docker image? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../..
    ./packages/mcp-screenshot/docker-build-push.sh --push
    cd packages/mcp-screenshot
    echo "✅ Docker image published"
else
    echo "⏭️  Skipped Docker build/push"
fi
echo ""

# Step 5: Build and publish VSCode extension
echo "📦 Step 5: Building VSCode extension..."
read -p "Build and publish VSCode extension? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../vscode-mcp-screenshot
    npm run compile
    npm run package
    npm run publish
    cd ../mcp-screenshot
    echo "✅ VSCode extension published"
else
    echo "⏭️  Skipped VSCode extension"
fi
echo ""

# Step 6: Create Git tag
echo "🏷️  Step 6: Creating Git tag..."
read -p "Create and push Git tag mcp-screenshot-v${VERSION}? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../..
    git add -A
    git commit -m "Release mcp-screenshot v${VERSION}" || echo "No changes to commit"
    git tag "mcp-screenshot-v${VERSION}"
    git push origin main
    git push origin "mcp-screenshot-v${VERSION}"
    cd packages/mcp-screenshot
    echo "✅ Git tag created and pushed"
else
    echo "⏭️  Skipped Git tag"
fi
echo ""

echo "=================================================="
echo "🎉 Release Process Complete!"
echo ""
echo "📋 Release Summary:"
echo "   Version: ${VERSION}"
echo "   NPM: https://www.npmjs.com/package/@ai-capabilities-suite/mcp-screenshot"
echo "   Docker: https://hub.docker.com/r/digitaldefiance/mcp-screenshot"
echo "   VSCode: https://marketplace.visualstudio.com/items?itemName=DigitalDefiance.mcp-screenshot"
echo "   GitHub: https://github.com/digital-defiance/ai-capabilities-suite/releases/tag/mcp-screenshot-v${VERSION}"
echo ""
echo "📝 Next Steps:"
echo "   1. Create GitHub release with release notes"
echo "   2. Submit to Docker MCP Registry"
echo "   3. Submit to MCP Registry"
echo "   4. Update documentation"
echo ""
