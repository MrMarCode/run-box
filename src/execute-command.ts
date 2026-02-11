import { spawn, type ChildProcess } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import type { ExecuteOutput, ServerConfig } from './types.js';

export interface ExecuteCommandOptions {
   command: string;
   cwd: string;
   timeout: number;
   maxOutputBytes: number;
   onProgress?: (chunk: string) => void;
   signal?: AbortSignal;
}

const activeProcesses: Map<string, ChildProcess> = new Map();

function generateId(): string {
   return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function validateCwd(cwd: string): Promise<boolean> {
   try {
      await access(cwd, constants.R_OK);
      return true;
   }
   catch(_err) {
      return false;
   }
}

export function executeCommand(options: ExecuteCommandOptions): Promise<ExecuteOutput> {
   const { command, cwd, timeout, maxOutputBytes, onProgress, signal } = options;

   return new Promise<ExecuteOutput>((resolve) => {
      const id = generateId();

      let stdoutBuffer = '',
          stderrBuffer = '',
          totalBytes = 0,
          killed = false,
          truncated = false,
          timeoutHandle: ReturnType<typeof setTimeout> | undefined,
          killHandle: ReturnType<typeof setTimeout> | undefined;

      const child = spawn(command, {
         shell: true,
         cwd,
         stdio: ['ignore', 'pipe', 'pipe'],
         detached: true,
      });

      activeProcesses.set(id, child);

      const cleanup = (): void => {
         activeProcesses.delete(id);
         if (timeoutHandle) {
            clearTimeout(timeoutHandle);
         }
         if (killHandle) {
            clearTimeout(killHandle);
         }
      };

      const killChild = (reason: 'timeout' | 'truncation' | 'shutdown' | 'cancel'): void => {
         if (killed) {
            return;
         }
         killed = true;
         truncated = reason === 'truncation';

         try { process.kill(-child.pid!, 'SIGTERM'); } catch(_e) { /* already dead */ }
         killHandle = setTimeout(() => {
            try { process.kill(-child.pid!, 'SIGKILL'); } catch(_e) { /* already dead */ }
         }, 2000);
      };

      const handleData = (stream: 'stdout' | 'stderr') => {
         return (chunk: Buffer): void => {
            const text = chunk.toString();
            const bytes = chunk.byteLength;

            if (totalBytes + bytes > maxOutputBytes) {
               const remaining = maxOutputBytes - totalBytes,
                     partial = text.slice(0, remaining);

               if (stream === 'stdout') {
                  stdoutBuffer += partial;
               } else {
                  stderrBuffer += partial;
               }
               totalBytes = maxOutputBytes;
               killChild('truncation');
               return;
            }

            totalBytes += bytes;
            if (stream === 'stdout') {
               stdoutBuffer += text;
            } else {
               stderrBuffer += text;
            }

            if (onProgress) {
               onProgress(text);
            }
         };
      };

      child.stdout!.on('data', handleData('stdout'));
      child.stderr!.on('data', handleData('stderr'));

      if (signal?.aborted) {
         killChild('cancel');
      } else if (signal) {
         signal.addEventListener('abort', () => { killChild('cancel'); }, { once: true });
      }

      timeoutHandle = setTimeout(() => {
         killChild('timeout');
      }, timeout);

      child.on('close', (code) => {
         cleanup();

         if (truncated) {
            stdoutBuffer += `\n[OUTPUT TRUNCATED at ${maxOutputBytes} bytes]`;
         }

         resolve({
            stdout: stdoutBuffer,
            stderr: stderrBuffer,
            exitCode: killed ? -1 : (code ?? -1),
            truncated,
            killed,
         });
      });

      child.on('error', (err) => {
         cleanup();
         resolve({
            stdout: stdoutBuffer,
            stderr: err.message,
            exitCode: -1,
            truncated: false,
            killed: false,
         });
      });
   });
}

export function cancelProcess(id: string): boolean {
   const child = activeProcesses.get(id);
   if (!child) {
      return false;
   }
   try { process.kill(-child.pid!, 'SIGTERM'); } catch(_e) { /* already dead */ }
   setTimeout(() => {
      try { process.kill(-child.pid!, 'SIGKILL'); } catch(_e) { /* already dead */ }
   }, 2000);
   return true;
}

export async function killAllProcesses(graceMs: number): Promise<void> {
   if (activeProcesses.size === 0) {
      return;
   }

   for (const child of activeProcesses.values()) {
      try { process.kill(-child.pid!, 'SIGTERM'); } catch(_e) { /* already dead */ }
   }

   await new Promise<void>((resolve) => {
      const check = setInterval(() => {
         if (activeProcesses.size === 0) {
            clearInterval(check);
            resolve();
         }
      }, 100);

      setTimeout(() => {
         clearInterval(check);
         for (const child of activeProcesses.values()) {
            try { process.kill(-child.pid!, 'SIGKILL'); } catch(_e) { /* already dead */ }
         }
         resolve();
      }, graceMs);
   });
}

export function getActiveProcessCount(): number {
   return activeProcesses.size;
}
