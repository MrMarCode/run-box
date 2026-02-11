import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ChildProcess } from 'node:child_process';

const SERVER_PATH = resolve(import.meta.dirname, '../../dist/index.js'),
      BASE_PORT = 3200;

let portCounter = 0;

function nextPort(): number {
   return BASE_PORT + (portCounter++);
}

function spawnServer(port: number, env?: Record<string, string>): ChildProcess {
   return spawn('node', [SERVER_PATH], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DEFAULT_CWD: '/tmp', PORT: String(port), HOST: '127.0.0.1', ...env },
   });
}

async function waitForHealth(port: number, timeoutMs = 10000): Promise<void> {
   const start = Date.now(),
         url = `http://127.0.0.1:${port}/health`;

   while (Date.now() - start < timeoutMs) {
      try {
         const res = await fetch(url);
         if (res.ok) {
            return;
         }
      }
      catch(_e) { /* server not ready yet */ }
      await new Promise((r) => { setTimeout(r, 100); });
   }
   throw new Error(`Server on port ${port} did not become healthy within ${timeoutMs}ms`);
}

function killServer(proc: ChildProcess): Promise<number | null> {
   return new Promise((resolve) => {
      const timeout = setTimeout(() => {
         proc.kill('SIGKILL');
         resolve(null);
      }, 10000);

      proc.on('close', (code) => {
         clearTimeout(timeout);
         resolve(code);
      });

      proc.kill('SIGTERM');
   });
}

async function createMcpClient(port: number): Promise<Client> {
   const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${port}/mcp`),
   ),
         client = new Client({ name: 'test-client', version: '1.0.0' });

   await client.connect(transport);
   return client;
}

describe('US1: Daemon Accepts HTTP Requests', () => {
   let proc: ChildProcess,
       port: number;

   beforeAll(async () => {
      port = nextPort();
      proc = spawnServer(port);
      await waitForHealth(port);
   });

   afterAll(async () => {
      await killServer(proc);
   });

   it('GET /health returns 200 {"status":"ok"}', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/health`),
            body = await res.json() as { status: string };

      expect(res.status).toBe(200);
      expect(body).toEqual({ status: 'ok' });
   });

   it('MCP initialize handshake returns server capabilities and session ID', async () => {
      const client = await createMcpClient(port);

      try {
         const info = client.getServerVersion();
         expect(info).toMatchObject({ name: 'run-box', version: '1.0.0' });
      } finally {
         await client.close();
      }
   });

   it('execute tool call returns stdout/stderr/exitCode over HTTP', async () => {
      const client = await createMcpClient(port);

      try {
         const result = await client.callTool({ name: 'execute', arguments: { command: 'echo "hello world"' } }),
               content = result.content as Array<{ type: string; text: string }>;

         expect(content[0].text).toContain('hello world');

         const structured = result.structuredContent as Record<string, unknown>;
         expect((structured.stdout as string).trim()).toBe('hello world');
         expect(structured.exitCode).toBe(0);
         expect(structured.killed).toBe(false);
      } finally {
         await client.close();
      }
   });

   it('two concurrent clients receive independent responses', async () => {
      const clientA = await createMcpClient(port),
            clientB = await createMcpClient(port);

      try {
         const [resultA, resultB] = await Promise.all([
            clientA.callTool({ name: 'execute', arguments: { command: 'echo "client-a"' } }),
            clientB.callTool({ name: 'execute', arguments: { command: 'echo "client-b"' } }),
         ]),
               structuredA = resultA.structuredContent as Record<string, unknown>,
               structuredB = resultB.structuredContent as Record<string, unknown>;

         expect((structuredA.stdout as string).trim()).toBe('client-a');
         expect((structuredB.stdout as string).trim()).toBe('client-b');
      } finally {
         await Promise.all([clientA.close(), clientB.close()]);
      }
   });

   it('malformed request returns error without crashing', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
         body: '{"not":"valid-jsonrpc"}',
      }),
            body = await res.json() as { error?: { message: string } };

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(body.error).toBeDefined();

      const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
      expect(healthRes.status).toBe(200);
   });
});

describe('US2: Long-Running Command Streaming', () => {
   let proc: ChildProcess,
       port: number;

   beforeAll(async () => {
      port = nextPort();
      proc = spawnServer(port);
      await waitForHealth(port);
   });

   afterAll(async () => {
      await killServer(proc);
   });

   it('progress notifications arrive incrementally before final result', async () => {
      const transport = new StreamableHTTPClientTransport(
               new URL(`http://127.0.0.1:${port}/mcp`),
            ),
            client = new Client({ name: 'test-streaming', version: '1.0.0' });

      await client.connect(transport);

      try {
         const progressMessages: string[] = [];

         const result = await client.callTool(
            {
               name: 'execute',
               arguments: { command: 'for i in 1 2 3; do echo $i; sleep 0.3; done' },
            },
            undefined,
            {
               onprogress: (progress) => {
                  if (progress.message) {
                     progressMessages.push(progress.message);
                  }
               },
            },
         );

         expect(progressMessages.length).toBeGreaterThanOrEqual(1);

         const structured = result.structuredContent as Record<string, unknown>;
         expect(structured.exitCode).toBe(0);
         expect((structured.stdout as string)).toContain('1');
         expect((structured.stdout as string)).toContain('3');
      } finally {
         await client.close();
      }
   });

   it('client without progress token receives only final result', async () => {
      const transport = new StreamableHTTPClientTransport(
               new URL(`http://127.0.0.1:${port}/mcp`),
            ),
            client = new Client({ name: 'test-no-progress', version: '1.0.0' });

      await client.connect(transport);

      try {
         const result = await client.callTool({
            name: 'execute',
            arguments: { command: 'echo "done"' },
         });

         const structured = result.structuredContent as Record<string, unknown>;
         expect(structured.exitCode).toBe(0);
         expect((structured.stdout as string).trim()).toBe('done');
      } finally {
         await client.close();
      }
   });
});

describe('US3: Graceful Shutdown', () => {
   it('SIGTERM when idle — daemon exits with code 0', async () => {
      const port = nextPort(),
            proc = spawnServer(port);

      await waitForHealth(port);

      const exitCode = await killServer(proc);
      expect(exitCode).toBe(0);
   });

   it('SIGTERM during in-flight command — daemon waits then exits with code 0', async () => {
      const port = nextPort(),
            proc = spawnServer(port);

      await waitForHealth(port);

      const initRes = await fetch(`http://127.0.0.1:${port}/mcp`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
               body: JSON.stringify({
                  jsonrpc: '2.0', id: 1, method: 'initialize',
                  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } },
               }),
            }),
            sessionId = initRes.headers.get('mcp-session-id')!;

      await fetch(`http://127.0.0.1:${port}/mcp`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Mcp-Session-Id': sessionId },
         body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      });

      const controller = new AbortController();

      fetch(`http://127.0.0.1:${port}/mcp`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Mcp-Session-Id': sessionId },
         body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'execute', arguments: { command: 'sleep 1 && echo "finished"' } } }),
         signal: controller.signal,
      }).catch(() => { /* aborted */ });

      await new Promise((r) => { setTimeout(r, 300); });

      const exitCode = await new Promise<number | null>((resolve) => {
         const timeout = setTimeout(() => {
            proc.kill('SIGKILL');
            resolve(null);
         }, 15000);

         proc.on('close', (code) => {
            clearTimeout(timeout);
            resolve(code);
         });

         proc.kill('SIGTERM');
      });

      controller.abort();
      expect(exitCode).toBe(0);
   });
});
