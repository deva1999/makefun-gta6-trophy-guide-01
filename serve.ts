// A tiny static server for trying the guide locally (Node 22, stdlib only):
//   node serve.ts
// then open http://localhost:8080 — it serves app/ at its root, exactly as the
// finalist review serves it, with the network off in spirit (nothing here fetches).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('app', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'));
  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
  res.end(readFileSync(path));
});

server.listen(8080, () => console.log('Leonida Platinum Atlas at http://localhost:8080'));
