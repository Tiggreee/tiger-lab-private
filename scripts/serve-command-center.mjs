import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || process.env.COMMAND_CENTER_PORT || 4310);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const root = path.join(repoRoot, 'ops');
const MCP_TOOLS_PATH = path.join(repoRoot, 'ops/mcp/lead-tools.json');

// Fix: serve /index.html -> /command-center/index.html
function defaultIndex(urlPath) {
  if (urlPath === '/' || urlPath === '/index.html') {
    return '/command-center/index.html';
  }
  if (urlPath === '/command-center' || urlPath === '/command-center/' || urlPath === '/command-center/index') {
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
  let effectivePath = filePath;
  if (fs.existsSync(effectivePath) && fs.statSync(effectivePath).isDirectory()) {
    effectivePath = path.join(effectivePath, 'index.html');
  }

  if (fs.existsSync(effectivePath) && fs.statSync(effectivePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  if (!fs.existsSync(effectivePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(effectivePath).toLowerCase();
  const type = contentTypes[ext] || 'application/octet-stream';
  const data = fs.readFileSync(effectivePath);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readRequestBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function handleMCP(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  // GET /runtime/telemetry — live command-center telemetry payload
  if (pathname === '/runtime/telemetry' && req.method === 'GET') {
    const executionModesPath = path.join(repoRoot, 'ops/runtime/execution-modes.json');
    const mcpActivityPath = path.join(repoRoot, 'ops/runtime/mcp-activity.json');
    const agentMonitorPath = path.join(repoRoot, 'ops/runtime/agent-monitor.json');

    let modeState = {};
    let mcpState = {};
    let agentState = {};

    try {
      if (fs.existsSync(executionModesPath)) {
        modeState = JSON.parse(fs.readFileSync(executionModesPath, 'utf8'));
      }
    } catch {}

    try {
      if (fs.existsSync(mcpActivityPath)) {
        mcpState = JSON.parse(fs.readFileSync(mcpActivityPath, 'utf8'));
      }
    } catch {}

    try {
      if (fs.existsSync(agentMonitorPath)) {
        agentState = JSON.parse(fs.readFileSync(agentMonitorPath, 'utf8'));
      }
    } catch {}

    const mcpReport = (mcpState && mcpState.report) || {};
    const agentSummary = (agentState && agentState.summary) || {};

    serveJson(res, 200, {
      checkedAt: new Date().toISOString(),
      mode: String(modeState.current || 'AUTO').toUpperCase(),
      busEvents: Number(modeState.busEvents || 0),
      busSubs: Number(modeState.busSubs || 0),
      wtActive: Number(modeState.activeWorktrees || 0),
      wtTotal: Number(modeState.totalPools || 0),
      memKeys: Number(modeState.memoryKeys || 0),
      mcpActive: Number(mcpReport.active || 0),
      mcpTotalUses: Number(mcpReport.totalUses || 0),
      agentsActive: Number(agentSummary.activeAgents || 0),
      agentsTotal: Number(agentSummary.totalAgents || 0)
    });
    return;
  }

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
    const idxPath = path.join(repoRoot, 'ops/runtime/campaigns/index.json');
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
        const outboxDir = path.join(repoRoot, 'ops/traffic/outbox');
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
        
        const campaignDir = path.join(repoRoot, 'ops/runtime/campaigns', campaignId);
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

  // POST /runtime/campaigns/:id/reject — reject campaign
  if (pathname.startsWith('/runtime/campaigns/reject') && req.method === 'POST') {
    const idxPath = path.join(repoRoot, 'ops/runtime/campaigns/index.json');
    const idx = fs.existsSync(idxPath) ? JSON.parse(fs.readFileSync(idxPath, 'utf8')) : { campaigns: [] };

    readRequestBodyJSON(req).then(body => {
      const campaignId = (body || {}).id;
      const entry = (idx.campaigns || []).find(c => c.id === campaignId);
      if (entry) {
        entry.status = 'rejected';
        entry.rejectedAt = new Date().toISOString();
        idx.updated = new Date().toISOString();
        fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
        serveJson(res, 200, { status: 'rejected', product: entry.product, message: 'Campaign rejected.' });
      } else {
        serveJson(res, 404, { error: 'Campaign not found' });
      }
    }).catch(() => serveJson(res, 500, { error: 'Failed to process rejection' }));
    return;
  }

  // POST /runtime/execution-mode/toggle — switch execution mode (AUTO/PRO/DEV)
  if (pathname === '/runtime/execution-mode/toggle' && req.method === 'POST') {
    const executionModesPath = path.join(repoRoot, 'ops/runtime/execution-modes.json');
    const validModes = new Set(['AUTO', 'PRO', 'DEV']);

    readRequestBodyJSON(req)
      .then((body) => {
        const requested = String((body || {}).mode || '').trim().toUpperCase();
        if (!validModes.has(requested)) {
          serveJson(res, 400, { error: 'Invalid mode. Expected AUTO, PRO, or DEV.' });
          return;
        }

        const now = new Date().toISOString();
        let currentState = { current: 'AUTO', history: [], lastChanged: now };
        if (fs.existsSync(executionModesPath)) {
          try {
            const raw = fs.readFileSync(executionModesPath, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              currentState = { ...currentState, ...parsed };
            }
          } catch {
            // Keep service available even if file is malformed.
          }
        }

        const previous = String(currentState.current || 'AUTO').toUpperCase();
        const nextState = {
          ...currentState,
          current: requested,
          lastChanged: now,
          history: [
            ...(Array.isArray(currentState.history) ? currentState.history : []),
            { from: previous, to: requested, changedAt: now }
          ].slice(-50)
        };

        fs.writeFileSync(executionModesPath, JSON.stringify(nextState, null, 2));
        serveJson(res, 200, { status: 'ok', previous, current: requested, lastChanged: now });
      })
      .catch((error) => {
        console.error('execution-mode toggle error:', error);
        serveJson(res, 500, { error: 'Failed to toggle execution mode', detail: error?.message || 'unknown error' });
      });
    return;
  }

  serveJson(res, 404, { error: 'MCP endpoint not found' });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  // API routes served by the command center backend.
  if (
    urlPath.startsWith('/mcp/') ||
    urlPath === '/runtime/telemetry' ||
    urlPath.startsWith('/runtime/campaigns/approve') ||
    urlPath.startsWith('/runtime/campaigns/reject') ||
    urlPath === '/runtime/execution-mode/toggle'
  ) {
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
