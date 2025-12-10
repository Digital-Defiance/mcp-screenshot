# Dockerfile for MCP Screenshot Server
# Installs the published NPM package

FROM node:20-alpine

# Install build dependencies and runtime dependencies
RUN apk add --no-cache \
    # Build tools for native modules
    python3 \
    py3-setuptools \
    make \
    g++ \
    # Runtime dependencies
    tini \
    # X11 and display server
    xvfb \
    x11vnc \
    fluxbox \
    # Screenshot tools
    scrot \
    imagemagick \
    # Image processing
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    # OCR for PII detection
    tesseract-ocr \
    tesseract-ocr-data-eng \
    # Utilities
    bash \
    dbus \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

# Set working directory
WORKDIR /app

# Install the published package from NPM
RUN npm install -g @ai-capabilities-suite/mcp-screenshot@1.5.22

# Copy Tesseract data
COPY --chown=mcp:mcp eng.traineddata /usr/share/tessdata/

# Create directories for screenshots
RUN mkdir -p /app/screenshots /tmp/.X11-unix && \
    chown -R mcp:mcp /app/screenshots /tmp/.X11-unix

# Copy entrypoint script
COPY --chown=mcp:mcp docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production \
    DISPLAY=:99 \
    TESSDATA_PREFIX=/usr/share/tessdata \
    LOG_LEVEL=info

# Expose port for VNC (optional, for debugging)
EXPOSE 5900

# Switch to non-root user
USER mcp

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]

# Run the MCP server
CMD ["mcp-screenshot-server"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Labels for metadata
LABEL org.opencontainers.image.title="MCP Screenshot Server" \
      org.opencontainers.image.description="Enterprise-grade MCP server for screenshot capture and processing" \
      org.opencontainers.image.vendor="Digital Defiance" \
      org.opencontainers.image.authors="Jessica Mulein <jessica@digitaldefiance.org>" \
      org.opencontainers.image.url="https://github.com/digital-defiance/ai-capabilities-suite" \
      org.opencontainers.image.source="https://github.com/digital-defiance/ai-capabilities-suite" \
      org.opencontainers.image.licenses="MIT"
