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
  if (urlPath === '/project-map.html' || urlPath === '/project-map-b.html' || urlPath === '/project-map-3d.html' || urlPath === '/checkout.html') {
    return '/command-center' + urlPath;
  }
  if (urlPath === '/campaign-preview.html') {
    return '/command-center/campaign-preview.html';
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

  // POST /runtime/campaigns/:id/approve — approve campaign
  if (pathname.startsWith('/runtime/campaigns/approve') && req.method === 'POST') {
    const approval = require('./engine/campaigns/approval-engine.mjs');
    // Simple inline approval for dashboard
    const fs = require('fs');
    const path = require('path');
    const idxPath = path.resolve('ops/runtime/campaigns/index.json');
    const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, 'utf8')) : { campaigns: [] };
    
    readRequestBodyJSON(req).then(body => {
      const campaignId = (body || {}).id;
      const entry = (idx.campaigns || []).find(c => c.id === campaignId);
      if (entry) {
        entry.status = 'approved';
        entry.approvedAt = new Date().toISOString();
        idx.updated = new Date().toISOString();
        fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
        
        // Build social pack
        const product = entry.product || 'Docflow API';
        const funnelUrl = `https://tiger-backend-production.up.railway.app/checkout?product=${encodeURIComponent(product.toLowerCase().replace(/\s+/g,'-'))}`;
        const outboxDir = path.resolve('ops/traffic/outbox');
        fs.mkdirSync(outboxDir, { recursive: true });
        
        const packName = `social-pack-${product.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-approved`;
        const pack = {
          campaign: packName, generatedAt: new Date().toISOString(), approved: true,
          product, campaignId,
          payments: {
            stripe: `https://tiger-backend-production.up.railway.app/api/checkout?product=${encodeURIComponent(product.toLowerCase().replace(/\s+/g,'-'))}&plan=starter&provider=stripe`,
            paypal: `https://tiger-backend-production.up.railway.app/api/checkout?product=${encodeURIComponent(product.toLowerCase().replace(/\s+/g,'-'))}&plan=starter&provider=paypal`
          },
          funnel: { trafficDestination: funnelUrl, closeChannel: 'landing', closeDestination: funnelUrl, closeLink: funnelUrl },
          channels: {}
        };
        
        const campaignDir = path.resolve('ops/runtime/campaigns', campaignId);
        const exts = { email:'html', linkedin:'txt', x:'txt', facebook:'txt', telegram:'md', discord:'md' };
        for (const [ch, ext] of Object.entries(exts)) {
          const f = path.join(campaignDir, `${ch}.${ext}`);
          if (fs.existsSync(f)) pack.channels[ch] = { copyPaste: fs.readFileSync(f, 'utf8') };
        }
        
        fs.writeFileSync(path.join(outboxDir, `${packName}.json`), JSON.stringify(pack, null, 2));
        
        serveJson(res, 200, { status: 'approved', product, funnelUrl, channels: Object.keys(pack.channels).length, message: 'Campaign approved. Social pack generated. Trigger publish manually or via pipeline.' });
      } else {
        serveJson(res, 404, { error: 'Campaign not found' });
      }
    }).catch(() => serveJson(res, 500, { error: 'Failed to process approval' }));
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
