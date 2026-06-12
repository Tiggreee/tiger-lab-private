import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.COMMAND_CENTER_PORT || 4310);
const root = path.resolve('ops');

// Fix: serve /index.html -> /command-center/index.html
function defaultIndex(urlPath) {
  if (urlPath === '/' || urlPath === '/index.html') {
    return '/command-center/index.html';
  }
  return urlPath;
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = contentTypes[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const target = defaultIndex(urlPath);
  const normalized = path.normalize(target).replace(/^\\+/, '').replace(/^\/+/, '');
  const filePath = path.join(root, normalized);

  if (!filePath.startsWith(root)) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Tiger Command Center running at http://localhost:${PORT}`);
});
