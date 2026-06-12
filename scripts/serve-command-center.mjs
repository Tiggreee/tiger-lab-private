import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.COMMAND_CENTER_PORT || 4310);
const root = path.resolve('ops');
const MCP_TOOLS_PATH = path.resolve('ops/mcp/lead-tools.json');

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

function serveJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

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

function handleMCP(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  // GET /mcp/tools — list all tools
  if (pathname === '/mcp/tools') {
    if (!fs.existsSync(MCP_TOOLS_PATH)) {
      serveJson(res, 200, { tools: [], server: 'tiger-lead-engine' });
      return;
    }
    const data = JSON.parse(fs.readFileSync(MCP_TOOLS_PATH, 'utf-8'));
    serveJson(res, 200, data);
    return;
  }

  // GET /mcp/tools/:id — get single tool
  const toolMatch = pathname.match(/^\/mcp\/tools\/([^/]+)$/);
  if (toolMatch) {
    if (!fs.existsSync(MCP_TOOLS_PATH)) {
      serveJson(res, 404, { error: 'No tools registered' });
      return;
    }
    const data = JSON.parse(fs.readFileSync(MCP_TOOLS_PATH, 'utf-8'));
    const tool = data.tools.find(t => t.id === toolMatch[1]);
    if (!tool) {
      serveJson(res, 404, { error: `Tool '${toolMatch[1]}' not found` });
      return;
    }
    serveJson(res, 200, tool);
    return;
  }

  // POST /mcp/tools/:id/execute — execute a tool (stub)
  if (pathname.startsWith('/mcp/tools/') && pathname.endsWith('/execute') && req.method === 'POST') {
    serveJson(res, 200, { status: 'ok', message: 'MCP tool execution stub — implement logic per tool' });
    return;
  }

  serveJson(res, 404, { error: 'MCP endpoint not found' });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // MCP route
  if (urlPath.startsWith('/mcp/')) {
    handleMCP(req, res);
    return;
  }

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
