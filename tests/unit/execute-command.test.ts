import { describe, it, expect } from 'vitest';
import { executeCommand, validateCwd, getActiveProcessCount } from '../../src/execute-command.js';

describe('executeCommand', () => {
   it('captures stdout from a successful command', async () => {
      const result = await executeCommand({
         command: 'echo "hello world"',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
      });

      expect(result.stdout.trim()).toBe('hello world');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.truncated).toBe(false);
      expect(result.killed).toBe(false);
   });

   it('captures non-zero exit code', async () => {
      const result = await executeCommand({
         command: 'exit 42',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
      });

      expect(result.exitCode).toBe(42);
      expect(result.killed).toBe(false);
   });

   it('captures stderr output', async () => {
      const result = await executeCommand({
         command: 'echo "error msg" >&2',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
      });

      expect(result.stderr.trim()).toBe('error msg');
      expect(result.exitCode).toBe(0);
   });

   it('captures both stdout and stderr', async () => {
      const result = await executeCommand({
         command: 'echo "out" && echo "err" >&2',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
      });

      expect(result.stdout).toContain('out');
      expect(result.stderr).toContain('err');
   });

   it('kills process on timeout and sets killed flag', async () => {
      const result = await executeCommand({
         command: 'sleep 60',
         cwd: '/tmp',
         timeout: 500,
         maxOutputBytes: 1024,
      });

      expect(result.killed).toBe(true);
      expect(result.exitCode).toBe(-1);
   });

   it('truncates output when exceeding maxOutputBytes', async () => {
      const result = await executeCommand({
         command: 'yes "aaaaaaaaaa" | head -c 2048',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 100,
      });

      expect(result.truncated).toBe(true);
      expect(result.killed).toBe(true);
      expect(result.stdout).toContain('[OUTPUT TRUNCATED');
   });

   it('handles concurrent execution independently', async () => {
      const [r1, r2] = await Promise.all([
         executeCommand({
            command: 'echo "first"',
            cwd: '/tmp',
            timeout: 5000,
            maxOutputBytes: 1024,
         }),
         executeCommand({
            command: 'echo "second"',
            cwd: '/tmp',
            timeout: 5000,
            maxOutputBytes: 1024,
         }),
      ]);

      expect(r1.stdout.trim()).toBe('first');
      expect(r2.stdout.trim()).toBe('second');
   });

   it('cleans up active processes after completion', async () => {
      await executeCommand({
         command: 'echo "done"',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
      });

      expect(getActiveProcessCount()).toBe(0);
   });
});

describe('streaming', () => {
   it('invokes onProgress callback with output chunks', async () => {
      const chunks: string[] = [];

      const result = await executeCommand({
         command: 'echo "line1" && echo "line2"',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
         onProgress: (chunk) => { chunks.push(chunk); },
      });

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      expect(chunks.join('')).toContain('line1');
      expect(result.exitCode).toBe(0);
   });

   it('invokes onProgress multiple times for multi-line output', async () => {
      const chunks: string[] = [];

      await executeCommand({
         command: 'for i in 1 2 3; do echo "chunk$i"; sleep 0.1; done',
         cwd: '/tmp',
         timeout: 5000,
         maxOutputBytes: 1024,
         onProgress: (chunk) => { chunks.push(chunk); },
      });

      expect(chunks.length).toBeGreaterThanOrEqual(2);
   });
});

describe('cancellation', () => {
   it('kills process when AbortSignal is aborted', async () => {
      const controller = new AbortController();

      setTimeout(() => { controller.abort(); }, 200);

      const result = await executeCommand({
         command: 'sleep 60',
         cwd: '/tmp',
         timeout: 30000,
         maxOutputBytes: 1024,
         signal: controller.signal,
      });

      expect(result.killed).toBe(true);
      expect(result.exitCode).toBe(-1);
   });

   it('kills immediately when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await executeCommand({
         command: 'sleep 60',
         cwd: '/tmp',
         timeout: 30000,
         maxOutputBytes: 1024,
         signal: controller.signal,
      });

      expect(result.killed).toBe(true);
      expect(result.exitCode).toBe(-1);
   });
});

describe('validateCwd', () => {
   it('returns true for an existing directory', async () => {
      expect(await validateCwd('/tmp')).toBe(true);
   });

   it('returns false for a non-existent directory', async () => {
      expect(await validateCwd('/nonexistent/path/that/does/not/exist')).toBe(false);
   });
});
