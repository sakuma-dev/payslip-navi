import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const server = spawn(process.execPath, ['.github/scripts/serve-web.mjs'], {
  stdio: ['ignore', 'ignore', 'inherit'],
  windowsHide: true,
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error('Web preview server exited before becoming ready');
    }
    try {
      const response = await fetch('http://127.0.0.1:19006', { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      // The server has not started listening yet.
    }
    await delay(100);
  }
  throw new Error('Web preview server did not become ready');
}

async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await Promise.race([exited, delay(3_000)]);
  if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
}

let result = 1;
try {
  await waitForServer();
  const test = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
    stdio: 'inherit',
    windowsHide: true,
  });
  result = await new Promise((resolve, reject) => {
    test.once('error', reject);
    test.once('exit', (code) => resolve(code ?? 1));
  });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Web E2E failed'}\n`);
} finally {
  await stopServer();
}

process.exitCode = result;
