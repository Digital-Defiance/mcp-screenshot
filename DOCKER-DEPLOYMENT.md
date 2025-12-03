# Docker Deployment Guide - MCP Screenshot

This guide covers deploying the MCP Screenshot server using Docker and Docker Compose.

## Table of Contents

- [Quick Start](#quick-start)
- [Building the Image](#building-the-image)
- [Running with Docker](#running-with-docker)
- [Running with Docker Compose](#running-with-docker-compose)
- [Configuration](#configuration)
- [Volumes and Persistence](#volumes-and-persistence)
- [Networking](#networking)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/digital-defiance/ai-capabilities-suite.git
cd ai-capabilities-suite/packages/mcp-screenshot

# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Using Docker

```bash
# Pull the image
docker pull digitaldefiance/mcp-screenshot:latest

# Run the container
docker run -d \
  --name mcp-screenshot \
  -v $(pwd)/screenshots:/app/screenshots \
  digitaldefiance/mcp-screenshot:latest
```

## Building the Image

### Build from Source

```bash
# Navigate to the package directory
cd packages/mcp-screenshot

# Build the image
docker build -t mcp-screenshot:local .

# Or use docker-compose
docker-compose build
```

### Multi-Platform Build

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t digitaldefiance/mcp-screenshot:latest \
  --push \
  .
```

### Build Arguments

```bash
# Build with custom Node version
docker build \
  --build-arg NODE_VERSION=20 \
  -t mcp-screenshot:custom \
  .
```

## Running with Docker

### Basic Run

```bash
docker run -d \
  --name mcp-screenshot \
  digitaldefiance/mcp-screenshot:latest
```

### With Volume Mounts

```bash
docker run -d \
  --name mcp-screenshot \
  -v $(pwd)/screenshots:/app/screenshots \
  -v $(pwd)/config.json:/app/config.json:ro \
  digitaldefiance/mcp-screenshot:latest
```

### With Environment Variables

```bash
docker run -d \
  --name mcp-screenshot \
  -e NODE_ENV=production \
  -e DISPLAY=:99 \
  -e ENABLE_VNC=true \
  -p 5900:5900 \
  digitaldefiance/mcp-screenshot:latest
```

### Interactive Mode (for testing)

```bash
docker run -it --rm \
  --name mcp-screenshot-test \
  -v $(pwd)/screenshots:/app/screenshots \
  digitaldefiance/mcp-screenshot:latest \
  /bin/bash
```

## Running with Docker Compose

### Production Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-screenshot:
    image: digitaldefiance/mcp-screenshot:latest
    container_name: mcp-screenshot
    restart: unless-stopped
    
    environment:
      - NODE_ENV=production
      - DISPLAY=:99
    
    volumes:
      - ./screenshots:/app/screenshots
      - ./config.json:/app/config.json:ro
    
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
```

### Development Configuration

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  mcp-screenshot-dev:
    build:
      context: .
      target: builder
    
    environment:
      - NODE_ENV=development
      - ENABLE_VNC=true
    
    volumes:
      - ./src:/app/src
      - ./screenshots:/app/screenshots
    
    ports:
      - "5900:5900"
    
    command: npm run watch
```

### Commands

```bash
# Start services
docker-compose up -d

# Start with specific profile
docker-compose --profile dev up -d

# View logs
docker-compose logs -f mcp-screenshot

# Restart service
docker-compose restart mcp-screenshot

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `DISPLAY` | `:99` | X11 display number |
| `TESSDATA_PREFIX` | `/usr/share/tessdata` | Tesseract data directory |
| `ENABLE_VNC` | `false` | Enable VNC server for debugging |

### Configuration File

Create a `config.json` file:

```json
{
  "securityPolicy": {
    "allowedDirectories": ["/app/screenshots"],
    "maxCapturesPerMinute": 60,
    "maxFileSize": 10485760
  },
  "excludedWindowPatterns": [
    "*password*",
    "*auth*",
    "*login*"
  ],
  "defaultFormat": "png",
  "defaultQuality": 90
}
```

Mount it in the container:

```bash
docker run -d \
  -v $(pwd)/config.json:/app/config.json:ro \
  digitaldefiance/mcp-screenshot:latest \
  node dist/src/cli.js --config=/app/config.json
```

## Volumes and Persistence

### Screenshot Storage

```bash
# Create a named volume
docker volume create mcp-screenshots

# Use the volume
docker run -d \
  -v mcp-screenshots:/app/screenshots \
  digitaldefiance/mcp-screenshot:latest
```

### Backup Screenshots

```bash
# Backup to tar archive
docker run --rm \
  -v mcp-screenshots:/app/screenshots \
  -v $(pwd):/backup \
  alpine tar czf /backup/screenshots-backup.tar.gz -C /app screenshots

# Restore from backup
docker run --rm \
  -v mcp-screenshots:/app/screenshots \
  -v $(pwd):/backup \
  alpine tar xzf /backup/screenshots-backup.tar.gz -C /app
```

## Networking

### Expose VNC for Debugging

```bash
docker run -d \
  -p 5900:5900 \
  -e ENABLE_VNC=true \
  digitaldefiance/mcp-screenshot:latest
```

Connect with VNC client:
```bash
# Using vncviewer
vncviewer localhost:5900

# Using macOS Screen Sharing
open vnc://localhost:5900
```

### Custom Network

```bash
# Create network
docker network create mcp-network

# Run container on network
docker run -d \
  --name mcp-screenshot \
  --network mcp-network \
  digitaldefiance/mcp-screenshot:latest
```

## Security

### Run as Non-Root User

The container runs as user `mcpuser` (UID 1001) by default.

### Read-Only Root Filesystem

```bash
docker run -d \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /app/screenshots \
  digitaldefiance/mcp-screenshot:latest
```

### Security Options

```bash
docker run -d \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=SYS_ADMIN \
  digitaldefiance/mcp-screenshot:latest
```

### Secrets Management

```bash
# Using Docker secrets (Swarm mode)
echo "my-secret-config" | docker secret create mcp-config -

docker service create \
  --name mcp-screenshot \
  --secret mcp-config \
  digitaldefiance/mcp-screenshot:latest
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs mcp-screenshot

# Check if Xvfb started
docker exec mcp-screenshot ps aux | grep Xvfb

# Test X server
docker exec mcp-screenshot xdpyinfo -display :99
```

### Screenshot Capture Fails

```bash
# Check display environment
docker exec mcp-screenshot env | grep DISPLAY

# Test screenshot manually
docker exec mcp-screenshot scrot /tmp/test.png

# Check permissions
docker exec mcp-screenshot ls -la /app/screenshots
```

### High Memory Usage

```bash
# Check memory usage
docker stats mcp-screenshot

# Set memory limits
docker run -d \
  --memory=1g \
  --memory-swap=2g \
  digitaldefiance/mcp-screenshot:latest
```

### VNC Connection Issues

```bash
# Check if VNC is running
docker exec mcp-screenshot ps aux | grep x11vnc

# Check port binding
docker port mcp-screenshot 5900

# Test VNC connection
nc -zv localhost 5900
```

## Production Deployment

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml mcp-screenshot

# Scale service
docker service scale mcp-screenshot_mcp-screenshot=3

# Update service
docker service update \
  --image digitaldefiance/mcp-screenshot:latest \
  mcp-screenshot_mcp-screenshot
```

### Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-screenshot
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mcp-screenshot
  template:
    metadata:
      labels:
        app: mcp-screenshot
    spec:
      containers:
      - name: mcp-screenshot
        image: digitaldefiance/mcp-screenshot:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DISPLAY
          value: ":99"
        resources:
          limits:
            memory: "2Gi"
            cpu: "2000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: screenshots
          mountPath: /app/screenshots
      volumes:
      - name: screenshots
        persistentVolumeClaim:
          claimName: mcp-screenshots-pvc
```

### Health Monitoring

```bash
# Add health check endpoint
docker run -d \
  --health-cmd="node -e \"console.log('healthy')\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  digitaldefiance/mcp-screenshot:latest

# Check health status
docker inspect --format='{{.State.Health.Status}}' mcp-screenshot
```

### Logging

```bash
# Configure logging driver
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  digitaldefiance/mcp-screenshot:latest

# View logs
docker logs -f --tail=100 mcp-screenshot

# Export logs
docker logs mcp-screenshot > mcp-screenshot.log
```

### Backup and Recovery

```bash
# Backup container state
docker commit mcp-screenshot mcp-screenshot-backup:$(date +%Y%m%d)

# Export container
docker export mcp-screenshot > mcp-screenshot-backup.tar

# Import container
docker import mcp-screenshot-backup.tar mcp-screenshot:restored
```

## Performance Optimization

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Caching

```bash
# Use BuildKit for better caching
DOCKER_BUILDKIT=1 docker build -t mcp-screenshot .

# Multi-stage build optimization
docker build --target=builder -t mcp-screenshot:builder .
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Xvfb Documentation](https://www.x.org/releases/X11R7.6/doc/man/man1/Xvfb.1.xhtml)

## Support

For Docker deployment issues:

1. Check container logs: `docker logs mcp-screenshot`
2. Review this guide
3. Open an issue on GitHub
4. Contact maintainers

---

**Last Updated**: 2024
**Maintainer**: Digital Defiance
**Package**: @ai-capabilities-suite/mcp-screenshot
