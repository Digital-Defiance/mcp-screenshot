#!/bin/bash
set -e

# Start Xvfb (X Virtual Frame Buffer) for headless screenshot capture
echo "Starting Xvfb on display $DISPLAY..."
Xvfb $DISPLAY -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Wait for X server to be ready
echo "Waiting for X server to be ready..."
for i in {1..10}; do
    if xdpyinfo -display $DISPLAY >/dev/null 2>&1; then
        echo "X server is ready"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "X server failed to start"
        exit 1
    fi
    sleep 1
done

# Start window manager (optional, for window capture testing)
fluxbox &

# Optional: Start VNC server for debugging
if [ "$ENABLE_VNC" = "true" ]; then
    echo "Starting VNC server on port 5900..."
    x11vnc -display $DISPLAY -forever -shared -rfbport 5900 &
fi

# Cleanup function
cleanup() {
    echo "Shutting down..."
    kill $XVFB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the MCP Screenshot server
echo "Starting MCP Screenshot server..."
exec "$@"
