const $ = id => document.getElementById(id);
const UNIFIED = '/runtime/dashboard-unified.json';
const ALERTS = '/runtime/dashboard-alerts.json';

async function fetchJSON(url) {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? r.json() : null; }
  catch { return null; }
}

function setLED(on) {
  $('engineLed').className = `led ${on ? 'led-green' : 'led-red'}`;
}

function renderKPIs(data) {
  const m = data.monetization || {};
  const am = data.agentMonitor?.summary || {};
  const kpis = [
    ['Leads', m.leadsToday ?? 0],
    ['Agents', am.activeAgents ?? 0],
    ['Products', data.products?.active ?? 0],
    ['Campaigns', data.campaigns?.total ?? 0]
  ];
  $('kpiRow').innerHTML = kpis.map(([l, v]) =>
    `<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('');
}

function renderGate(data) {
  const gate = data.systemStatus?.gate || '---';
  const el = $('systemStatusBadge');
  el.textContent = gate;
  el.className = `gate-badge ${gate === 'GO' ? 'gate-go' : 'gate-nogo'}`;
}

function renderEngineLED(data) {
  const impl = data.implementationTracker?.summary?.implementationPercent || 0;
  const db = (data.leadEngine?.stats?.companies || 0) > 0;
  const gateOk = data.systemStatus?.gate === 'GO';
  const prodAvg = data.productEngine?.engine?.averageScore || 0;
  const ok = impl >= 80 && db && gateOk && prodAvg >= 70;
  setLED(ok);
  const reasons = [];
  if (impl < 80) reasons.push(`Impl ${impl}%`);
  if (!db) reasons.push('DB empty');
  if (!gateOk) reasons.push(`Gate ${data.systemStatus?.gate || '?'}`);
  if (prodAvg < 70) reasons.push(`Prod avg ${prodAvg}`);
  $('engineLed').title = ok ? 'Engine RUNNING' : 'Engine STOPPED: ' + reasons.join('; ');
}

function renderProducts(data) {
  const prods = (data.productEngine?.topProducts || []).slice(0, 5);
  if (!prods.length) { $('productScores').innerHTML = '<div class="dim">No scores</div>'; return; }
  $('productScores').innerHTML = prods.map(p => {
    const s = p.score || 0;
    const color = s >= 95 ? '#3fb950' : s >= 75 ? '#d29922' : s >= 50 ? '#f0883e' : '#f85149';
    return `<div class="score-bar">
      <span class="name" title="${p.name}">${p.name}</span>
      <div class="bar"><div class="fill" style="width:${s}%;background:${color}"></div></div>
      <span class="val">${s}</span>
      <span class="tier">${p.tier || ''}</span>
    </div>`;
  }).join('');
}

function renderLeads(data) {
  const le = data.leadEngine?.stats;
  if (!le) { $('leadsContent').innerHTML = '<div class="dim">No lead data</div>'; return; }
  const ledEl = $('leadEngineLed');
  const st = data.leadEngine?.ledStatus || '---';
  if (ledEl) { ledEl.textContent = st; ledEl.className = `gate-badge ${st === 'GREEN' ? 'gate-go' : 'gate-nogo'}`; }
  let h = `<div class="lead-row"><span class="lbl">Companies:</span> <b>${le.companies || 0}</b></div>`;
  const byInd = le.byIndustry || {};
  if (Object.keys(byInd).length) {
    h += '<div class="lead-section"><h3>Top Industries</h3>';
    Object.entries(byInd).slice(0, 6).forEach(([k, v]) => {
      h += `<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`;
    });
    h += '</div>';
  }
  const byCity = le.byCity || {};
  if (Object.keys(byCity).length) {
    h += '<div class="lead-section"><h3>Top Cities</h3>';
    Object.entries(byCity).slice(0, 6).forEach(([k, v]) => {
      h += `<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`;
    });
    h += '</div>';
  }
  $('leadsContent').innerHTML = h;
}

async function renderAlerts() {
  const data = await fetchJSON(ALERTS);
  if (!data) { $('alertsContent').innerHTML = '<div class="dim">No alert data</div>'; return; }
  const icon = data.status === 'OK' ? '\u{1F7E2}' : data.status === 'DEGRADED' ? '\u{1F7E1}' : '\u{1F534}';
  $('alertsStatus').innerHTML = icon;
  $('alertsTime').textContent = `Last check: ${new Date(data.checkedAt).toLocaleString()}`;
  $('alertsContent').innerHTML = (data.alerts || []).map(a =>
    `<div class="alert-item alert-${a.level.toLowerCase()}">${a.msg}</div>`
  ).join('') || '<div class="dim">All clear</div>';
}

async function render() {
  const unified = await fetchJSON(UNIFIED);
  if (!unified) { $('footerText').textContent = 'Could not load dashboard. Run `npm run command-center` first.'; return; }
  renderKPIs(unified);
  renderGate(unified);
  renderEngineLED(unified);
  renderProducts(unified);
  renderLeads(unified);
  renderAlerts();
  if (window.CampaignManager) { try { await CampaignManager.init(); } catch {} }
  $('footerText').textContent = `Last refresh: ${new Date().toLocaleString()}`;
}

$('refreshBtn').addEventListener('click', render);
$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) return alert('Notifications not supported');
  const p = await Notification.requestPermission();
  alert(p === 'granted' ? 'Alerts enabled' : 'Alerts not enabled');
});

setInterval(renderAlerts, 60000);
render().catch(console.error);
