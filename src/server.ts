import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZExecuteInput, ZExecuteOutput, loadServerConfig } from './types.js';
import type { ExecuteInput, ExecuteOutput, ServerConfig } from './types.js';
import type { CallToolResult, ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { executeCommand, validateCwd } from './execute-command.js';

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function formatTextResponse(cwd: string, command: string, result: ExecuteOutput, config: ServerConfig): string {
   let text = `${cwd} $ ${command}\n`;

   if (result.stdout) {
      text += result.stdout;
   }
   if (result.stderr) {
      text += result.stderr;
   }

   if (result.killed && result.truncated) {
      text += `\n[OUTPUT TRUNCATED at ${config.MAX_OUTPUT_BYTES} bytes]`;
   } else if (result.killed) {
      text += `\n[KILLED: timeout]`;
   } else {
      text += `\n[exit code: ${result.exitCode}]`;
   }

   return text;
}

export function createServer(): McpServer {
   const config = loadServerConfig(),
         server = new McpServer({
            name: 'run-box',
            version: '1.0.0',
         });

   server.registerTool(
      'execute',
      {
         title: 'Execute Shell Command',
         description: 'Execute a shell command in /bin/sh and return stdout, stderr, and exit code.',
         inputSchema: ZExecuteInput,
         outputSchema: ZExecuteOutput,
      },
      async (args: ExecuteInput, extra: ToolExtra): Promise<CallToolResult> => {
         const cwd = args.cwd || config.DEFAULT_CWD,
               timeout = args.timeout || config.DEFAULT_TIMEOUT_MS,
               progressToken = extra._meta?.progressToken;

         const cwdValid = await validateCwd(cwd);
         if (!cwdValid) {
            return {
               content: [{ type: 'text', text: `ERROR: Working directory does not exist: ${cwd}` }],
               isError: true,
            };
         }

         let progressCounter = 0;

         const onProgress = progressToken
            ? (chunk: string): void => {
               progressCounter++;
               extra.sendNotification({
                  method: 'notifications/progress',
                  params: {
                     progressToken,
                     progress: progressCounter,
                     total: 1,
                     message: chunk,
                  },
               }).catch(() => { /* client may have disconnected */ });
            }
            : undefined;

         const result = await executeCommand({
            command: args.command,
            cwd,
            timeout,
            maxOutputBytes: config.MAX_OUTPUT_BYTES,
            onProgress,
            signal: extra.signal,
         });

         const isError = result.killed || result.truncated;

         return {
            content: [{ type: 'text', text: formatTextResponse(cwd, args.command, result, config) }],
            structuredContent: result as unknown as Record<string, unknown>,
            isError: isError || undefined,
         };
      },
   );

   return server;
}
