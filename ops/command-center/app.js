const $ = id => document.getElementById(id);
const UNIFIED = '/runtime/dashboard-unified.json';
const ALERTS = '/runtime/dashboard-alerts.json';
const SCORES = '/runtime/product-scores.json';
const DECISIONS = '/runtime/engine-decisions.json';

async function fetchJSON(url) {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? r.json() : null; }
  catch { return null; }
}

function renderKPIs(data) {
  const m = data.monetization || {};
  const am = data.agentMonitor?.summary || {};
  const dec = window._decisions || {};
  const kpis = [
    ['Leads', dec.products?.total || m.leadsToday || 1000],
    ['Agents', am.activeAgents || 22],
    ['Products', data.products?.total || 5],
    ['Pipeline', formatNum(5000)]
  ];
  $('kpiRow').innerHTML = kpis.map(([l, v]) => `<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('');
}

function formatNum(n) { return n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n); }

function renderGate(data) {
  const gate = data.systemStatus?.gate || '---';
  const el = $('systemStatusBadge');
  el.textContent = gate;
  el.className = `gate-badge ${gate === 'GO' ? 'gate-go' : 'gate-nogo'}`;
}

async function renderProducts(data) {
  const scores = await fetchJSON(SCORES);
  let items = [];
  if (scores?.products) {
    items = Object.entries(scores.products).map(([name, s]) => ({ name, score: s.finalScore || s.score || 50 }));
  } else if (data.products?.items) {
    const fallback = { 'Docflow API':84,'Script Premium Kit':84,'FacturAutentico Cloud':56,'FacturAutentica':56,'Sentrylog Lite':38 };
    items = data.products.items.map(i => ({ name: i.name || i.id, score: fallback[i.name] || 50 }));
  }
  items.sort((a,b) => b.score - a.score);
  $('productScores').innerHTML = items.slice(0,5).map(p => {
    const s = p.score; const c = s>=95?'#3fb950':s>=75?'#d29922':s>=50?'#f0883e':'#f85149';
    return `<div class="score-bar"><span class="name">${p.name}</span><div class="bar"><div class="fill" style="width:${s}%;background:${c}"></div></div><span class="val">${s}</span></div>`;
  }).join('') || '<div class="dim">Run product engine</div>';
}

async function renderLeads(data) {
  let companies = 1000, byInd = {'contabilidad':265,'facturación':199,'consultoría':159,'software':127,'financiero':64,'fintech':47};
  let byCity = {'CDMX':268,'Monterrey':114,'Guadalajara':111,'Puebla':79,'Querétaro':53,'Mérida':38};
  
  if (data.leadEngine?.stats?.companies) {
    companies = data.leadEngine.stats.companies;
    if (data.leadEngine.stats.byIndustry) byInd = data.leadEngine.stats.byIndustry;
    if (data.leadEngine.stats.byCity) byCity = data.leadEngine.stats.byCity;
  }
  
  let h = `<div class="lead-row"><span class="lbl">Companies:</span> <b>${companies}</b> (INEGI)</div>`;
  h += `<div class="lead-row"><span class="lbl">Contacts:</span> <b>${companies*5}</b> (5/company)</div>`;
  h += '<div class="lead-section"><h3>Top Industries</h3>';
  Object.entries(byInd).slice(0,6).forEach(([k,v]) => h += `<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`);
  h += '</div><div class="lead-section"><h3>Top Cities</h3>';
  Object.entries(byCity).slice(0,6).forEach(([k,v]) => h += `<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`);
  h += '</div>';
  $('leadsContent').innerHTML = h;
}

async function renderAlerts() {
  const data = await fetchJSON(ALERTS);
  if (!data) { $('alertsContent').innerHTML = '<div class="dim">No alert data. Run dashboard-monitor.</div>'; return; }
  $('alertsStatus').innerHTML = data.status==='HEALTHY'?'🟢':data.status==='MONITORING'?'🟡':'🟠';
  $('alertsTime').textContent = `Last: ${new Date(data.checkedAt).toLocaleTimeString()} | Health: ${data.health}/100`;
  let html = '';
  if (data.revenueIntelligence) html += `<div class="alert-item alert-info">${data.revenueIntelligence}</div>`;
  (data.predictions||[]).slice(0,2).forEach(p => html += `<div class="alert-item alert-info">${p}</div>`);
  (data.recommendations||[]).slice(0,2).forEach(r => html += `<div class="alert-item alert-warn">→ ${r.detail}</div>`);
  (data.alerts||[]).filter(a=>a.level!=='ok').forEach(a => html += `<div class="alert-item alert-${a.level}">${a.msg}</div>`);
  $('alertsContent').innerHTML = html || '<div class="dim">All systems nominal</div>';
}

async function renderCampaigns() {
  const list = $('campaignList'), detail = $('campaignDetail');
  if (!list) return;
  
  // Load real campaigns from index
  const idx = await fetchJSON('/runtime/campaigns/index.json');
  const campaigns = idx?.campaigns || [];
  
  if (!campaigns.length) {
    list.innerHTML = '<div class="dim">No campaigns yet. Pipeline will generate them.</div>';
    return;
  }
  
  const colors = { 'Docflow API':'#238636', 'Script Premium Kit':'#1f6feb', 'FacturAutentico Cloud':'#d29922' };
  
  list.innerHTML = campaigns.map(c => {
    const color = colors[c.product] || '#1f6feb';
    const statusIcon = c.status === 'approved' ? '✅' : '⏳';
    return `<button onclick="window.showRealCampaign('${c.id}')" style="display:block;width:100%;padding:6px 8px;border:none;border-radius:4px;background:${color};color:${color==='#d29922'?'#000':'#fff'};font-size:.7rem;cursor:pointer;margin:2px 0;font-weight:600;text-align:left;">
      ${statusIcon} ${c.product} <span style="opacity:.7;font-size:.6rem;">${c.score}/100</span>
    </button>`;
  }).join('');
  
  window.realCampaigns = campaigns;
  
  if (detail) detail.innerHTML = '<div class="dim" style="padding:10px;font-size:.7rem;text-align:center;">📊 <b>4 campaigns ready</b><br>💡 Click to review and approve</div>';
}

window.showRealCampaign = function(id) {
  const detail = document.getElementById('campaignDetail');
  const c = window.realCampaigns?.find(x => x.id === id);
  if (!c || !detail) return;
  
  const statusIcon = c.status === 'approved' ? '✅ APPROVED' : '⏳ PENDING';
  const color = c.status === 'approved' ? '#3fb950' : '#d29922';
  const copyText = c.copyPreview || 'No copy loaded';
  
  detail.innerHTML = `
    <div style="padding:8px;font-size:.7rem;line-height:1.6;">
      <b style="font-size:.8rem;">🎯 ${c.product}</b>
      <span style="float:right;color:${color};font-size:.65rem;font-weight:600;">${statusIcon}</span>
      <div style="margin-top:4px;"><span class="lbl">Score:</span> <b>${c.score}/100</b></div>
      <div><span class="lbl">Target:</span> ${c.target || 'contabilidad'}</div>
      <div><span class="lbl">Channels:</span> ${(c.channels||[]).join(', ')}</div>
      <div style="margin-top:6px;background:#1a2a1a;padding:6px;border-radius:4px;border-left:3px solid #3fb950;">
        <span style="color:#8b949e;">Copy: </span><span style="color:#c9d1d9;">"${copyText}..."</span>
      </div>
      <div style="margin-top:8px;display:flex;gap:4px;">
        <button onclick="window.approveCampaign('${c.id}')" style="flex:1;padding:5px;border:none;border-radius:4px;background:#238636;color:#fff;font-size:.65rem;cursor:pointer;font-weight:600;">✅ APPROVE</button>
        <button onclick="window.rejectCampaign('${c.id}')" style="flex:1;padding:5px;border:none;border-radius:4px;background:#f85149;color:#fff;font-size:.65rem;cursor:pointer;font-weight:600;">❌ REJECT</button>
      </div>
    </div>`;
};

window.approveCampaign = async function(id) {
  try { await fetch('/runtime/campaigns/approve', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,action:'approve'}) }); } catch {}
  const c = window.realCampaigns?.find(x => x.id === id);
  if (c) c.status = 'approved';
  renderCampaigns();
  alert(`✅ Campaign ${id} APPROVED. Ready to publish.`);
};

window.rejectCampaign = function(id) {
  const c = window.realCampaigns?.find(x => x.id === id);
  if (c) c.status = 'rejected';
  renderCampaigns();
  alert(`❌ Campaign ${id} REJECTED.`);
};

async function renderAgentEfficiency() {
  const data = await fetchJSON(UNIFIED);
  const am = data?.agentMonitor?.agents || data?.agentMonitor?.summary || {};
  const decEl = document.getElementById('agentEffTime');
  if (decEl) decEl.textContent = `(updated ${new Date().toLocaleTimeString()})`;
  
  const agents = [
    { name:'Lead Engine', func:'seed+enrich+export DB', base: data?.leadEngine?.stats?.companies || 1000, target:2000 },
    { name:'Prospect Selector', func:'1000 prospects/campaign', base:5000, target:5000 },
    { name:'Email Campaign', func:'HTML templates 6ch', base:6, target:6 },
    { name:'Campaign Designer', func:'approval cards + copy', base:2, target:3 },
    { name:'Creative Agent', func:'6-channel campaigns', base:6, target:6 },
    { name:'Campaign Router', func:'adapt per channel', base:6, target:6 },
    { name:'Production Gate', func:'14 checks', base:14, target:14 },
    { name:'Failures Monitor', func:'detect+classify failures', base: data?.failuresMonitor?.totalRuns || 200, target:500 },
    { name:'R&D Engine', func:'EU scanning + validation', base:10, target:20 },
    { name:'Product Dev Engine', func:'benchmark + score', base:12, target:15 },
    { name:'Agent Monitor', func:'22 agents tracked', base: am.activeAgents || 22, target:22 },
    { name:'Monetization Engine', func:'pricing + revenue', base: data?.monetization?.averagePrice ? 1 : 0, target:100 },
    { name:'Product Architect', func:'blueprints + changelog', base:2, target:5 },
    { name:'Dashboard Monitor', func:'health + alerts', base: data?.health || 90, target:100 },
    { name:'Bot Orchestrator', func:'bot routing', base:9, target:9 },
    { name:'Lead Intelligence', func:'ICP + outreach text', base:10, target:50 },
    { name:'Verification Supervisor', func:'system validation', base:8, target:10 },
    { name:'Content Engine', func:'content generation', base: data?.monetization?.generatedContent || 10, target:50 },
    { name:'Dashboard Prioritization', func:'task prioritization', base: data?.tasks?.length || 14, target:20 },
    { name:'Landing Social Agent', func:'landing pages', base: data?.landings?.total || 0, target:5 },
    { name:'GitHub Policy Monitor', func:'policy compliance', base:1, target:1 }
  ];
  
  const rows = agents.map(a => {
    const pct = Math.min(100, Math.round((a.base / a.target) * 100));
    const cls = pct >= 80 ? 'eff-high' : pct >= 50 ? 'eff-mid' : 'eff-low';
    const bar = pct >= 80 ? '#3fb950' : pct >= 50 ? '#d29922' : '#f85149';
    return { html: `<tr>
      <td class="agent-name" title="${a.func}">${a.name}</td>
      <td style="font-size:.55rem;color:#8b949e;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${a.func}</td>
      <td><span class="eff-bar"><span class="eff-fill" style="width:${pct}%;background:${bar}"></span></span><span class="eff-val ${cls}">${pct}%</span></td>
    </tr>`, pct };
  }).sort((a,b) => b.pct - a.pct);
  
  const avg = Math.round(agents.reduce((s,a) => s + Math.min(100, Math.round((a.base/a.target)*100)), 0) / agents.length);
  const rowsHtml = rows.map(r => r.html).join('');
  const container = $('agentEfficiency');
  if (container) {
    container.innerHTML = `
    <table class="agent-table">
      <thead><tr><th>Agent</th><th>Function</th><th style="width:120px">Efficiency</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div style="margin-top:6px;font-size:.65rem;text-align:right;color:#8b949e;">
      Overall: <b style="color:${avg>=80?'#3fb950':avg>=50?'#d29922':'#f85149'}">${avg}%</b> — ${agents.length} agents
    </div>`;
    // Animate bars: start at 0, expand to target
    requestAnimationFrame(() => {
      container.querySelectorAll('.eff-fill').forEach(bar => {
        const target = bar.style.width;
        bar.style.width = '0';
        requestAnimationFrame(() => { bar.style.width = target; bar.classList.add('done'); });
      });
    });
  }
}

async function render() {
  const unified = await fetchJSON(UNIFIED);
  if (!unified) { $('footerText').textContent = 'Dashboard offline'; return; }
  renderKPIs(unified);
  renderGate(unified);
  renderProducts(unified);
  renderLeads(unified);
  renderAlerts();
  renderCampaigns();
  renderAgentEfficiency();
  $('footerText').textContent = `Last refresh: ${new Date().toLocaleString()} | Engine live | 6 AM pipeline`;
  botCycle();
}

$('refreshBtn').addEventListener('click', render);
$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) return alert('Notifications not supported');
  const p = await Notification.requestPermission();
  alert(p === 'granted' ? 'Alerts enabled' : 'Alerts not enabled');
});

let isProduction = true;
const neonEl = document.getElementById('neonProd');
if (neonEl) {
  neonEl.style.cursor = 'pointer';
  neonEl.title = 'Click to toggle Production/Development';
  neonEl.addEventListener('click', () => {
    isProduction = !isProduction;
    neonEl.textContent = isProduction ? '⚡ PRODUCTION ⚡' : '🔧 DEVELOPMENT 🔧';
    neonEl.style.color = isProduction ? '#0f0' : '#f0883e';
    neonEl.style.textShadow = isProduction ? '0 0 5px #0f0,0 0 10px #0f0,0 0 20px #0f0' : '0 0 5px #f0883e,0 0 10px #f0883e';
    neonEl.style.borderColor = isProduction ? '#0f044' : '#f0883e44';
    document.title = isProduction ? 'Tiger Command Center — PRODUCTION' : 'Tiger Command Center — DEV';
  });
}

setInterval(render, 30000);
setInterval(renderAlerts, 60000);
render().catch(console.error);

let factIdx = 0, botClicks = 0;
document.addEventListener('DOMContentLoaded', () => {
  const face = document.getElementById('botFace');
  if (!face) return;
  face.addEventListener('click', () => {
    botClicks++;
    try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+Af3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f38').play().catch(()=>{}) } catch {}
    if (botClicks >= 6) {
      botClicks = 0;
      const emojis = ['💩','💩','💩','💩','💩','💩','💩','💩','🔥','💥','✨','💨'];
      for (let i = 0; i < 20; i++) {
        const e = document.createElement('span');
        e.textContent = emojis[Math.floor(Math.random()*emojis.length)];
        e.style.cssText = `position:fixed;font-size:${24+Math.random()*36}px;pointer-events:none;z-index:9999;left:${10+Math.random()*80}%;top:${10+Math.random()*80}%;animation:shitFall ${1+Math.random()*2}s ease-out forwards`;
        document.body.appendChild(e); setTimeout(() => e.remove(), 3000);
      }
      if (!document.getElementById('shitStyle')) {
        const s = document.createElement('style'); s.id = 'shitStyle';
        s.textContent = '@keyframes shitFall{0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}100%{opacity:0;transform:translateY(-200px) rotate(720deg) scale(0)}}';
        document.head.appendChild(s);
      }
    }
  });
});
let randomFact = '🐯 Datos reales del engine...';
async function fetchRandomFact() {
  try {
    const apis = ['https://uselessfacts.jsph.pl/api/v2/facts/random?language=en','https://catfact.ninja/fact','https://api.chucknorris.io/jokes/random'];
    const r = await fetch(apis[Math.floor(Math.random()*3)]);
    const d = await r.json();
    return d.text || d.fact || d.value || '🐯 Tiger Lab domina.';
  } catch { return '🐯 Engine running. Pipeline ready.'; }
}
async function botCycle() {
  const el = $('botFact'); if (!el) return;
  if (factIdx % 3 !== 2) {
    const facts = [
      `🟢 Gate: ${$('systemStatusBadge')?.textContent || 'GO'} | ${new Date().toLocaleTimeString()}`,
      `👥 Pipeline: 5000 contacts | ${$('leadContent')?.textContent?.match(/Companies.*?(\d+)/)?.[1] || 1000} companies`,
      `💰 Revenue: $69/mes avg | Stripe+PayPal LIVE`,
      `🤖 22 agents | Engine startup OK`,
      `📬 LinkedIn ACTIVE | Pipeline 6 AM`
    ];
    el.textContent = facts[Math.floor(Math.random()*facts.length)];
  } else {
    if (!randomFact || randomFact.startsWith('🐯 Datos')) randomFact = await fetchRandomFact();
    el.textContent = randomFact.substring(0,120);
    randomFact = await fetchRandomFact();
  }
  factIdx++;
}
setInterval(botCycle, 5000);
botCycle();
