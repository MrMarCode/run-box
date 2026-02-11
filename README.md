# run-box

MCP server that executes arbitrary shell commands over HTTP transport. Designed for AI agents that need to run commands on a local machine or inside a container. The daemon listens on a configurable port and serves MCP protocol over Streamable HTTP with SSE streaming.

## Quick Start

### Local Development

```bash
npm install
npm run build
node dist/index.js
```

The daemon starts on `http://127.0.0.1:3100`. Verify with:

```bash
curl http://127.0.0.1:3100/health
# {"status":"ok"}
```

### Container

```bash
./build.sh
podman run --rm -p 3100:3100 -v /path/to/code:/workspace localhost/run-box
```

## MCP Client Configuration

```jsonc
{
   "mcpServers": {
      "run-box": {
         "url": "http://127.0.0.1:3100/mcp"
      }
   }
}
```

### Container (with volume mount)

Start the container first, then point your MCP client at it:

```bash
podman run --rm -p 3100:3100 -v /home/user/Code:/workspace localhost/run-box
```

```jsonc
{
   "mcpServers": {
      "run-box": {
         "url": "http://127.0.0.1:3100/mcp"
      }
   }
}
```

## Tool: `execute`

Runs a shell command in `/bin/sh` and returns stdout, stderr, and exit code.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | ✅ | Shell command to execute |
| `cwd` | string | ❌ | Working directory (absolute path) |
| `timeout` | number | ❌ | Timeout in milliseconds (1000–3600000) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | TCP port to listen on |
| `HOST` | `127.0.0.1` | Bind address |
| `DEFAULT_CWD` | `/workspace` | Default working directory |
| `DEFAULT_TIMEOUT_MS` | `300000` | Default timeout (5 min) |
| `MAX_OUTPUT_BYTES` | `10485760` | Max output per command (10 MB) |
| `SHUTDOWN_GRACE_MS` | `5000` | Grace period before SIGKILL on shutdown |

## Testing

```bash
npm test              # all tests
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only
```

## Features

- **HTTP transport**: Streamable HTTP with SSE streaming for concurrent MCP clients
- **Execute commands**: Run any shell command and get stdout, stderr, exit code
- **Streaming**: Progress notifications for long-running commands (via `_meta.progressToken`)
- **Cancellation**: Cancel in-flight commands via MCP `notifications/cancelled`
- **Timeout**: Configurable per-command timeout with automatic process kill
- **Output limiting**: Configurable max output size with truncation indicator
- **Container**: Multi-stage Dockerfile with dev tools (git, curl, build-essential)
- **Volume mounts**: Mount host directories into the container at `/workspace`
- **Graceful shutdown**: SIGTERM/SIGINT handling with process cleanup
- **Health check**: `GET /health` endpoint for orchestrators
