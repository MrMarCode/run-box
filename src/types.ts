import { z } from 'zod/v4';

export const ZExecuteInput = z.object({
   command: z.string()
      .min(1)
      .describe('Shell command to execute (passed to /bin/sh -c)'),
   cwd: z.string()
      .startsWith('/')
      .optional()
      .describe('Working directory (absolute path). Defaults to DEFAULT_CWD env var.'),
   timeout: z.number()
      .int()
      .min(1000)
      .max(3600000)
      .optional()
      .describe('Timeout in milliseconds. Defaults to DEFAULT_TIMEOUT_MS env var.'),
});

export const ZExecuteOutput = z.object({
   stdout: z.string().describe('Standard output from the command'),
   stderr: z.string().describe('Standard error from the command'),
   exitCode: z.number().int().describe('Process exit code'),
   truncated: z.boolean().describe('Whether output was truncated'),
   killed: z.boolean().describe('Whether the process was killed'),
});

export type ExecuteInput = z.infer<typeof ZExecuteInput>;
export type ExecuteOutput = z.infer<typeof ZExecuteOutput>;

export interface ServerConfig {
   DEFAULT_CWD: string;
   DEFAULT_TIMEOUT_MS: number;
   MAX_OUTPUT_BYTES: number;
   SHUTDOWN_GRACE_MS: number;
   PORT: number;
   HOST: string;
}

const DEFAULT_CWD = '/workspace',
      DEFAULT_TIMEOUT_MS = 300_000,
      MAX_OUTPUT_BYTES = 10_485_760,
      SHUTDOWN_GRACE_MS = 5_000,
      PORT = 3100,
      HOST = '127.0.0.1';

export function loadServerConfig(): ServerConfig {
   const port = parseInt(process.env.PORT || '', 10) || PORT;

   if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid PORT: ${process.env.PORT} (must be integer 1–65535)`);
   }

   return {
      DEFAULT_CWD: process.env.DEFAULT_CWD || DEFAULT_CWD,
      DEFAULT_TIMEOUT_MS: parseInt(process.env.DEFAULT_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS,
      MAX_OUTPUT_BYTES: parseInt(process.env.MAX_OUTPUT_BYTES || '', 10) || MAX_OUTPUT_BYTES,
      SHUTDOWN_GRACE_MS: parseInt(process.env.SHUTDOWN_GRACE_MS || '', 10) || SHUTDOWN_GRACE_MS,
      PORT: port,
      HOST: process.env.HOST || HOST,
   };
}
