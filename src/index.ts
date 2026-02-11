import { createServer as createHttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './server.js';
import { killAllProcesses } from './execute-command.js';
import { loadServerConfig } from './types.js';
import type { ServerConfig } from './types.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

const config: ServerConfig = loadServerConfig(),
      sessions = new Map<string, StreamableHTTPServerTransport>();

let isShuttingDown = false;

function jsonResponse(res: ServerResponse, status: number, body: object): void {
   res.writeHead(status, { 'Content-Type': 'application/json' });
   res.end(JSON.stringify(body));
}

async function handlePostMcp(req: IncomingMessage, res: ServerResponse, body: unknown): Promise<void> {
   const sessionId = req.headers['mcp-session-id'] as string | undefined;

   if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      await transport.handleRequest(req, res, body);
      return;
   }

   if (!sessionId && isInitializeRequest(body)) {
      const transport = new StreamableHTTPServerTransport({
         sessionIdGenerator: () => randomUUID(),
         onsessioninitialized: (sid) => { sessions.set(sid, transport); },
      });

      transport.onclose = () => {
         const sid = transport.sessionId;
         if (sid) {
            sessions.delete(sid);
         }
      };

      const mcpServer = createServer();
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
      return;
   }

   if (sessionId && !sessions.has(sessionId)) {
      jsonResponse(res, 404, { jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
      return;
   }

   jsonResponse(res, 400, { jsonrpc: '2.0', error: { code: -32600, message: 'Bad Request: missing session ID or not an initialize request' }, id: null });
}

async function handleGetMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
   const sessionId = req.headers['mcp-session-id'] as string | undefined;

   if (!sessionId) {
      jsonResponse(res, 400, { jsonrpc: '2.0', error: { code: -32600, message: 'Missing Mcp-Session-Id header' }, id: null });
      return;
   }

   const transport = sessions.get(sessionId);
   if (!transport) {
      jsonResponse(res, 404, { jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
      return;
   }

   await transport.handleRequest(req, res);
}

async function handleDeleteMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
   const sessionId = req.headers['mcp-session-id'] as string | undefined;

   if (!sessionId) {
      jsonResponse(res, 400, { jsonrpc: '2.0', error: { code: -32600, message: 'Missing Mcp-Session-Id header' }, id: null });
      return;
   }

   const transport = sessions.get(sessionId);
   if (!transport) {
      jsonResponse(res, 404, { jsonrpc: '2.0', error: { code: -32000, message: 'Session not found' }, id: null });
      return;
   }

   await transport.handleRequest(req, res);
}

function parseBody(req: IncomingMessage): Promise<unknown> {
   return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      req.on('end', () => {
         try {
            resolve(data ? JSON.parse(data) : undefined);
         }
         catch(err) {
            reject(err);
         }
      });
      req.on('error', reject);
   });
}

const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
   const { method, url } = req,
         pathname = url?.split('?')[0];

   if (isShuttingDown) {
      jsonResponse(res, 503, { jsonrpc: '2.0', error: { code: -32000, message: 'Service Unavailable: server is shutting down' }, id: null });
      return;
   }

   if (method === 'GET' && pathname === '/health') {
      jsonResponse(res, 200, { status: 'ok' });
      return;
   }

   if (pathname === '/mcp') {
      try {
         if (method === 'POST') {
            const body = await parseBody(req);
            await handlePostMcp(req, res, body);
            return;
         }

         if (method === 'GET') {
            await handleGetMcp(req, res);
            return;
         }

         if (method === 'DELETE') {
            await handleDeleteMcp(req, res);
            return;
         }
      }
      catch(err) {
         console.error('Error handling MCP request:', err);
         if (!res.headersSent) {
            jsonResponse(res, 500, { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
         }
         return;
      }
   }

   jsonResponse(res, 404, { error: 'Not found' });
});

httpServer.on('error', (err: NodeJS.ErrnoException) => {
   if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.PORT} is already in use`);
      process.exit(1);
   }
   console.error('HTTP server error:', err);
});

async function shutdown(): Promise<void> {
   if (isShuttingDown) {
      return;
   }
   isShuttingDown = true;

   for (const transport of sessions.values()) {
      await transport.close();
   }
   sessions.clear();

   await killAllProcesses(config.SHUTDOWN_GRACE_MS);

   httpServer.closeAllConnections();
   httpServer.close(() => {
      process.exit(0);
   });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

httpServer.listen(config.PORT, config.HOST, () => {
   console.info(`run-box listening on http://${config.HOST}:${config.PORT}`);
});
