import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('dist');
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    const target = resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end();
      return;
    }

    const file = target === root ? resolve(root, 'index.html') : target;
    try {
      const content = await readFile(file);
      response.writeHead(200, { 'content-type': mimeTypes[extname(file)] ?? 'application/octet-stream' }).end(content);
    } catch (error) {
      if (error?.code !== 'ENOENT' || extname(file)) throw error;
      const content = await readFile(resolve(root, 'index.html'));
      response.writeHead(200, { 'content-type': mimeTypes['.html'] }).end(content);
    }
  } catch {
    response.writeHead(404).end();
  }
});

const shutdown = () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2_000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.listen(19006, '127.0.0.1');
