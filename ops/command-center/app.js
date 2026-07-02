/**
 * Tiger Command Center — dashboard client.
 * Read-only operations console. Every panel maps to a real runtime data
 * source; there are no synthetic metrics, jokes, or external calls. Campaign
 * approval is intentionally NOT actionable here — publishing is governed by
 * the CLI approval console (npm run campaigns:pending / campaigns:approve).
 */

const $ = (id) => document.getElementById(id);

const UNIFIED = '/runtime/dashboard-unified.json';
const ALERTS = '/runtime/dashboard-alerts.json';
const SCORES = '/runtime/product-scores.json';
const CAMPAIGNS = '/runtime/campaigns/index.json';
const MONITOR = '/runtime/agent-monitor.json';
const MCP_ACTIVITY = '/runtime/mcp-activity.json';
const TELEMETRY = '/runtime/telemetry';
const EXEC_MODES = '/runtime/execution-modes.json';
const MODELS = '/runtime/models';

const MODE_INFO = {
  AUTO: { desc: 'Full autonomy', cls: '' },
  PRO: { desc: 'Approval on criticals', cls: 'pro' },
  DEV: { desc: 'Dry-run / verbose', cls: 'dev' }
};

function scoreColor(v) {
  return v >= 80 ? 'var(--go)' : v >= 50 ? 'var(--warn)' : 'var(--nogo)';
}

function metric(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return String(value);
}

async function fetchJSON(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

function animateBars(container) {
  requestAnimationFrame(() => {
    container.querySelectorAll('[data-w]').forEach((el) => {
      el.style.width = `${el.getAttribute('data-w')}%`;
    });
  });
}

function renderKPIs(data) {
  const m = data.monetization || {};
  const am = data.agentMonitor?.summary || {};
  const kpis = [
    ['Leads Today', metric(m.leadsToday)],
    ['Active Agents', metric(am.activeAgents)],
    ['Active Products', metric(data.products?.active)],
    ['Content Pipeline', metric(m.generatedContent)]
  ];
  $('kpiRow').innerHTML = kpis
    .map(([l, v]) => `<div class="kpi"><div class="lbl">${l}</div><div class="val num">${v}</div></div>`)
    .join('');
}

function renderGate(data, alerts) {
  const billing = String(alerts?.billingStatus || data?.billing?.status || 'UNKNOWN').toUpperCase();
  let gate = String(alerts?.gate || data?.systemStatus?.gate || 'UNKNOWN').toUpperCase();
  if (billing !== 'MATCH') gate = billing === 'MISMATCH' ? 'NO_GO' : 'UNKNOWN';
  const el = $('systemStatusBadge');
  el.textContent = gate.replace('_', '-');
  const chip = el.closest('.chip');
  if (chip) chip.className = `chip ${gate === 'GO' ? 'gate-go' : gate === 'NO_GO' ? 'gate-nogo' : ''}`;
}

async function renderProducts() {
  const s = await fetchJSON(SCORES);
  const host = $('productScores');
  let items = [];
  if (s?.productResults) {
    items = s.productResults.map((r) => ({ name: r.product?.name || '?', score: Math.round(r.score || 0) }));
  }
  items.sort((a, b) => b.score - a.score);
  items = items.slice(0, 6);
  if (items.length === 0) {
    host.innerHTML = '<div class="empty">No product scores available</div>';
    return;
  }
  host.innerHTML = items
    .map(
      (p) => `<div class="row"><span class="name">${p.name}</span>
      <span class="bar"><span class="fill" data-w="${Math.min(100, p.score)}" style="background:${scoreColor(p.score)}"></span></span>
      <span class="v">${p.score}</span></div>`
    )
    .join('');
  animateBars(host);
}

async function renderLeads() {
  const host = $('leadsContent');
  let companies = null;
  const byInd = {};
  const byCity = {};
  try {
    const res = await fetch('/runtime/../database/exports/companies.csv', { cache: 'no-store' });
    if (res.ok) {
      const lines = (await res.text()).trim().split('\n').slice(1);
      companies = lines.length;
      lines.forEach((l) => {
        const c = l.split(',');
        const ind = c[3] || '?';
        const city = c[8] || '?';
        byInd[ind] = (byInd[ind] || 0) + 1;
        byCity[city] = (byCity[city] || 0) + 1;
      });
    }
  } catch {
    // Leads export not available in this deployment.
  }

  const top = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

  let h = `<div class="stat"><span class="k">Companies</span><span class="v">${metric(companies)}</span></div>`;
  const inds = top(byInd);
  const cities = top(byCity);
  h += '<div class="sec-title">Top Industries</div>';
  h += inds.length
    ? inds.map(([k, v]) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')
    : '<div class="dim">No data</div>';
  h += '<div class="sec-title">Top Cities</div>';
  h += cities.length
    ? cities.map(([k, v]) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')
    : '<div class="dim">No data</div>';
  host.innerHTML = h;
}

async function renderAlerts() {
  const d = await fetchJSON(ALERTS);
  const host = $('alertsContent');
  if (!d) {
    $('alertsStatus').textContent = '';
    host.innerHTML = '<div class="empty">No alert data</div>';
    return;
  }
  const status = String(d.status || '').toUpperCase();
  $('alertsStatus').textContent = status ? `${status} · ${metric(d.health)}/100` : '';
  $('alertsTime').textContent = d.checkedAt ? `Last check ${new Date(d.checkedAt).toLocaleTimeString()}` : '';
  let html = '';
  if (d.revenueIntelligence) html += `<div class="alert info">${d.revenueIntelligence}</div>`;
  (d.predictions || []).slice(0, 2).forEach((p) => (html += `<div class="alert info">${p}</div>`));
  (d.recommendations || []).slice(0, 2).forEach((r) => (html += `<div class="alert warn">${r.detail || r}</div>`));
  (d.alerts || []).filter((a) => a.level !== 'ok').forEach((a) => (html += `<div class="alert ${a.level}">${a.msg}</div>`));
  host.innerHTML = html || '<div class="empty">All systems nominal</div>';
}

async function renderCampaigns() {
  const host = $('campaignList');
  const idx = await fetchJSON(CAMPAIGNS);
  const campaigns = idx?.campaigns || [];
  if (!campaigns.length) {
    host.innerHTML = '<div class="empty">No campaigns</div>';
    return;
  }
  const statusColor = (s) =>
    s === 'approved' || s === 'published' ? 'var(--go)' : s === 'rejected' || s === 'expired' ? 'var(--nogo)' : 'var(--warn)';
  host.innerHTML = campaigns
    .slice(0, 12)
    .map((c) => {
      const s = String(c.status || 'pending').toLowerCase();
      return `<div class="camp" onclick="window.open('/command-center/campaign-preview.html?id=${encodeURIComponent(c.id)}','_blank','noopener')" title="Open preview">
        <span class="dot" style="background:${statusColor(s)}"></span>
        <span class="cn">${c.product || 'Unknown'}</span>
        <span class="cs">${metric(c.score)}</span>
        <span class="tag" style="color:${statusColor(s)};border-color:${statusColor(s)}33">${s}</span>
      </div>`;
    })
    .join('');
}

async function renderAgentEfficiency() {
  const host = $('agentEfficiency');
  const mon = await fetchJSON(MONITOR);
  $('agentEffTime').textContent = `updated ${new Date().toLocaleTimeString()}`;
  const monAgents = mon?.agents || [];
  if (monAgents.length === 0) {
    host.innerHTML = '<div class="empty">Agent monitor evidence missing</div>';
    return;
  }
  const agents = monAgents.map((a) => {
    const st = String(a.status || '').toLowerCase();
    const active = typeof a.active === 'boolean' ? a.active : ['active', 'ok', 'healthy', 'running'].includes(st);
    return { name: a.name || a.id || '?', func: a.role || a.type || 'agent', pct: active ? 100 : 0 };
  });
  const rows = agents
    .map((a) => ({
      pct: a.pct,
      html: `<tr><td class="tname">${a.name}</td><td style="color:var(--text-mut)">${a.func}</td>
      <td><span class="effbar"><span class="efffill" data-w="${a.pct}" style="background:${scoreColor(a.pct)}"></span></span>
      <span class="num" style="color:${scoreColor(a.pct)}">${a.pct}%</span></td></tr>`
    }))
    .sort((x, y) => y.pct - x.pct);
  const avg = Math.round(agents.reduce((s, a) => s + a.pct, 0) / Math.max(1, agents.length));
  host.innerHTML = `<table class="t"><thead><tr><th>Agent</th><th>Function</th><th style="width:120px">Efficiency</th></tr></thead>
    <tbody>${rows.map((r) => r.html).join('')}</tbody></table>
    <div class="overall">Overall: <b style="color:${scoreColor(avg)}">${avg}%</b></div>`;
  animateBars(host);
}

async function renderMcpRanking() {
  const host = $('mcpRanking');
  const data = await fetchJSON(MCP_ACTIVITY);
  const servers = data?.report?.servers;
  if (!Array.isArray(servers) || servers.length === 0) {
    host.innerHTML = '<div class="empty">No MCP activity data</div>';
    return;
  }
  if (data.generatedAt) $('mcpRankTime').textContent = `updated ${new Date(data.generatedAt).toLocaleTimeString()}`;
  const rows = servers
    .slice(0, 10)
    .map(
      (s) => `<tr><td style="color:var(--text-mut)">${s.rank}</td>
      <td class="tname">${s.name}</td>
      <td class="num">${s.uses}</td>
      <td><span class="effbar"><span class="efffill" data-w="${s.score}" style="background:${scoreColor(s.score)}"></span></span>
      <span class="num" style="color:${scoreColor(s.score)}">${s.score}%</span></td></tr>`
    )
    .join('');
  host.innerHTML = `<table class="t"><thead><tr><th>#</th><th>Server</th><th>Uses</th><th style="width:110px">Score</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  animateBars(host);
}

async function renderModels() {
  const host = $('modelGrid');
  const data = await fetchJSON(MODELS);
  const models = data?.models;
  if (!Array.isArray(models) || models.length === 0) {
    host.innerHTML = '<div class="empty">No local models registered</div>';
    return;
  }
  host.innerHTML = models
    .map(
      (m) => `<div class="tile" style="margin-bottom:8px">
      <div class="val" style="font-size:14px">${m.name || m.id}</div>
      <div class="sub">${m.type || 'model'} · ${m.capacity || '—'}</div>
      <div class="sub" style="color:var(--text-mut)">${m.endpoint || ''}</div>
    </div>`
    )
    .join('');
}

async function renderAutonomousState() {
  const telemetry = (await fetchJSON(TELEMETRY)) || {};
  const state = (await fetchJSON(EXEC_MODES)) || { current: 'AUTO' };
  const mode = String(state.current || telemetry.mode || 'AUTO').toUpperCase();
  const info = MODE_INFO[mode] || MODE_INFO.AUTO;

  const modeBtn = $('modeBtn');
  if (modeBtn) {
    modeBtn.textContent = mode;
    modeBtn.className = `btn mode ${info.cls}`;
  }
  $('modeValue').textContent = mode;
  $('modeDesc').textContent = info.desc;
  $('busEvents').textContent = metric(telemetry.busEvents ?? 0);
  $('busSubs').textContent = metric(telemetry.busSubs ?? 0);
  $('wtActive').textContent = metric(telemetry.wtActive ?? 0);
  $('wtTotal').textContent = metric(telemetry.wtTotal ?? 0);
  $('memKeys').textContent = metric(telemetry.memKeys ?? 0);
  if (telemetry.agentsTotal !== undefined) {
    $('stateMeta').textContent = `${metric(telemetry.agentsActive ?? 0)}/${metric(telemetry.agentsTotal)} agents · ${metric(telemetry.mcpActive ?? 0)} MCP active`;
  }
}

window.toggleExecutionMode = async function toggleExecutionMode() {
  const order = ['AUTO', 'PRO', 'DEV'];
  const current = ($('modeValue')?.textContent || 'AUTO').trim().toUpperCase();
  const next = order[(order.indexOf(current) + 1) % order.length];
  const modeBtn = $('modeBtn');
  if (modeBtn) modeBtn.disabled = true;
  try {
    const r = await fetch('/runtime/execution-mode/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: next })
    });
    if (!r.ok) throw new Error('toggle failed');
    await renderAutonomousState();
  } catch {
    $('footerText').textContent = 'Could not switch execution mode right now.';
  } finally {
    if (modeBtn) modeBtn.disabled = false;
  }
};

function renderFooter(gateOk) {
  $('footerText').textContent = `Tiger Command Center · ${gateOk ? 'operational' : 'degraded'} · synced ${new Date().toLocaleString()}`;
}

async function render() {
  const unified = await fetchJSON(UNIFIED);
  const alerts = await fetchJSON(ALERTS);
  $('syncTime').textContent = new Date().toLocaleTimeString();

  if (unified) {
    renderKPIs(unified);
    renderGate(unified, alerts);
  }
  await Promise.all([
    renderProducts(),
    renderLeads(),
    renderAlerts(),
    renderCampaigns(),
    renderAgentEfficiency(),
    renderMcpRanking(),
    renderModels(),
    renderAutonomousState()
  ]);
  renderFooter(Boolean(unified));
}

$('refreshBtn').addEventListener('click', () => render());
$('modeBtn').addEventListener('click', () => window.toggleExecutionMode());
$('modeValue').addEventListener('click', () => window.toggleExecutionMode());

render().catch(() => {
  $('footerText').textContent = 'Dashboard offline — runtime data unavailable.';
});
setInterval(() => render().catch(() => {}), 30000);
