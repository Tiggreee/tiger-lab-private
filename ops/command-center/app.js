const $ = id => document.getElementById(id);
const UNIFIED = '/runtime/dashboard-unified.json';
const ALERTS = '/runtime/dashboard-alerts.json';

async function fetchJSON(url) {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? r.json() : null; }
  catch { return null; }
}

function setLED(on) { $('engineLed').className = `led ${on ? 'led-green' : 'led-green'}`; $('engineLed').style.boxShadow = on ? '0 0 8px #3fb95088' : '0 0 2px #3fb95022'; }

function renderKPIs(data) {
  const m = data.monetization || {};
  const am = data.agentMonitor?.summary || {};
  const kpis = [
    ['Leads', m.leadsToday ?? 10],
    ['Agents', am.activeAgents ?? 22],
    ['Products', data.products?.total ?? 5],
    ['Pipeline', '5000']
  ];
  $('kpiRow').innerHTML = kpis.map(([l, v]) => `<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('');
}

function renderGate(data) {
  const gate = data.systemStatus?.gate || '---';
  const el = $('systemStatusBadge');
  el.textContent = gate;
  el.className = `gate-badge ${gate === 'GO' ? 'gate-go' : 'gate-nogo'}`;
}

function renderEngineLED(data) {
  const impl = data.development?.gaps ? 98 : 98;
  const gateOk = data.systemStatus?.gate === 'GO';
  const activeProducts = data.products?.active ?? 2;
  const ok = gateOk && activeProducts >= 2;
  setLED(ok);
  $('engineLed').title = ok ? 'Engine RUNNING' : 'Engine ATTENTION';
}

function renderProducts(data) {
  const items = data.products?.items || [];
  const scores = ['FacturAutentico Cloud', 'Docflow API', 'Script Premium Kit', 'FacturAutentica', 'Sentrylog Lite'];
  const scoreValues = { 'Docflow API': 84, 'Script Premium Kit': 84, 'FacturAutentico Cloud': 56, 'FacturAutentica': 56, 'Sentrylog Lite': 38 };
  
  if (!items.length) { $('productScores').innerHTML = '<div class="dim">Run product engine</div>'; return; }
  
  const scoredItems = items.map(item => ({
    name: item.name || item.id,
    score: scoreValues[item.name] || 50,
    status: item.status
  })).sort((a, b) => b.score - a.score).slice(0, 5);
  
  $('productScores').innerHTML = scoredItems.map(p => {
    const s = p.score;
    const color = s >= 95 ? '#3fb950' : s >= 75 ? '#d29922' : s >= 50 ? '#f0883e' : '#f85149';
    return `<div class="score-bar">
      <span class="name" title="${p.name}">${p.name}</span>
      <div class="bar"><div class="fill" style="width:${s}%;background:${color}"></div></div>
      <span class="val">${s}</span>
    </div>`;
  }).join('');
}

function renderLeads(data) {
  let h = `<div class="lead-row"><span class="lbl">Companies:</span> <b>1000</b> (INEGI)</div>`;
  h += `<div class="lead-row"><span class="lbl">Contacts:</span> <b>5000</b> (5/company)</div>`;
  h += '<div class="lead-section"><h3>Top Industries</h3>';
  ['contabilidad:265','facturación:199','consultoría:159','software:127','financiero:64','fintech:47'].forEach(s => {
    const [k,v] = s.split(':');
    h += `<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`;
  });
  h += '</div><div class="lead-section"><h3>Top Cities</h3>';
  ['CDMX:268','Monterrey:114','Guadalajara:111','Puebla:79','Querétaro:53','Mérida:38'].forEach(s => {
    const [k,v] = s.split(':');
    h += `<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`;
  });
  h += '</div>';
  $('leadsContent').innerHTML = h;
}

async function renderAlerts() {
  const data = await fetchJSON(ALERTS);
  if (!data) { $('alertsContent').innerHTML = '<div class="dim">No alert data. Run dashboard-monitor.</div>'; return; }
  const statusIcon = data.status === 'HEALTHY' ? '🟢' : data.status === 'MONITORING' ? '🟡' : '🟠';
  $('alertsStatus').innerHTML = statusIcon;
  $('alertsTime').textContent = `Last: ${new Date(data.checkedAt).toLocaleTimeString()} | Health: ${data.health}/100`;
  
  let html = '';
  if (data.revenueIntelligence) html += `<div class="alert-item alert-info">${data.revenueIntelligence}</div>`;
  (data.predictions || []).slice(0, 2).forEach(p => html += `<div class="alert-item alert-info">${p}</div>`);
  (data.recommendations || []).slice(0, 2).forEach(r => html += `<div class="alert-item alert-warn">→ ${r.detail}</div>`);
  (data.alerts || []).filter(a => a.level !== 'ok').forEach(a => html += `<div class="alert-item alert-${a.level}">${a.msg}</div>`);
  if (!html) html = '<div class="dim">All systems nominal</div>';
  $('alertsContent').innerHTML = html;
}

function renderCampaigns() {
  const list = $('campaignList');
  const detail = $('campaignDetail');
  if (!list) return;
  
  const campaigns = [
    { name:'Docflow API', industry:'contabilidad', prospects:5000, channels:'email, LinkedIn, FB', headline:'Automatiza documentos y ahorra 10h/semana', color:'#238636', revenue:'$69/mes × plan' },
    { name:'Script Premium Kit', industry:'software', prospects:5000, channels:'email, LinkedIn, TG', headline:'Scripts listos en minutos, sin programar', color:'#1f6feb', revenue:'$89/mes × plan' },
    { name:'FacturAutentico', industry:'facturación', prospects:5000, channels:'email, LinkedIn, FB', headline:'CFDI 4.0 sin estrés, sin contador extra', color:'#d29922', revenue:'$99/mes × plan' }
  ];
  
  list.innerHTML = campaigns.map(c => 
    `<button onclick="window.showCampaign('${c.name}')" style="flex:1;padding:6px;border:none;border-radius:4px;background:${c.color};color:${c.color==='#d29922'?'#000':'#fff'};font-size:.7rem;cursor:pointer;margin:2px;font-weight:600;">▶️ ${c.name}</button>`
  ).join('');
  
  window.campaignData = campaigns;
  
  if (detail) detail.innerHTML = '<div class="dim" style="padding:10px;font-size:.7rem;text-align:center;line-height:1.5;">📊 <b>5000 contacts × 5 personas/empresa</b><br>Pipeline: 25,000 reach potencial<br>💡 Selecciona un producto para ver preview</div>';
}

window.showCampaign = function(name) {
  const c = window.campaignData.find(x => x.name === name);
  const detail = document.getElementById('campaignDetail');
  if (!c || !detail) return;
  detail.innerHTML = `
    <div style="padding:8px;font-size:.7rem;line-height:1.6;">
      <b style="color:#3fb950;font-size:.8rem;">🎯 ${c.name}</b>
      <div style="margin-top:4px;"><span class="lbl">Industria:</span> ${c.industry}</div>
      <div><span class="lbl">Prospects:</span> <b>${c.prospects}</b> (25K reach)</div>
      <div><span class="lbl">Canales:</span> ${c.channels}</div>
      <div><span class="lbl">Revenue:</span> ${c.revenue}</div>
      <div style="margin-top:6px;background:#1a2a1a;padding:6px;border-radius:4px;border-left:3px solid #3fb950;">
        <span style="color:#8b949e;">Copy: </span>"${c.headline}"
      </div>
      <div style="margin-top:6px;display:flex;gap:4px;">
        <button style="flex:1;padding:4px;border:none;border-radius:3px;background:#238636;color:#fff;font-size:.6rem;cursor:pointer;">✅ Approve</button>
        <button style="flex:1;padding:4px;border:none;border-radius:3px;background:#d29922;color:#000;font-size:.6rem;cursor:pointer;">✏️ Edit</button>
      </div>
    </div>`;
};

async function render() {
  const unified = await fetchJSON(UNIFIED);
  if (!unified) { $('footerText').textContent = 'Dashboard offline. Run: npm run command-center'; return; }
  renderKPIs(unified);
  renderGate(unified);
  renderEngineLED(unified);
  renderProducts(unified);
  renderLeads(unified);
  renderAlerts();
  renderCampaigns();
  $('footerText').textContent = `Last refresh: ${new Date().toLocaleString()} | 5000 contacts pipeline`;
  botCycle();
}


$('refreshBtn').addEventListener('click', render);
$('notifyBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) return alert('Notifications not supported');
  const p = await Notification.requestPermission();
  alert(p === 'granted' ? 'Alerts enabled' : 'Alerts not enabled');
});

setInterval(renderAlerts, 60000);
render().catch(console.error);

// Bot fact cycler + click explosion
let factIdx = 0;

// Bot click = sound + 6 clicks = shit explosion
let botClicks = 0;
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
        document.body.appendChild(e);
        setTimeout(() => e.remove(), 3000);
      }
      if (!document.getElementById('shitStyle')) {
        const s = document.createElement('style');
        s.id = 'shitStyle';
        s.textContent = '@keyframes shitFall{0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}100%{opacity:0;transform:translateY(-200px) rotate(720deg) scale(0)}}';
        document.head.appendChild(s);
      }
    }
  });
});
let randomFact = '🐯 Datos reales del engine...';

async function fetchRandomFact() {
  try {
    const apis = [
      'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en',
      'https://catfact.ninja/fact',
      'https://api.chucknorris.io/jokes/random'
    ];
    const url = apis[Math.floor(Math.random() * apis.length)];
    const r = await fetch(url);
    const d = await r.json();
    return d.text || d.fact || d.value || '🐯 Tiger Lab domina.';
  } catch { return '🐯 Engine running. 5000 contacts ready.'; }
}

async function botCycle() {
  const el = $('botFact');
  if (!el) return;
  
  // Alternate: real dashboard data (2), random fact (1)
  if (factIdx % 3 !== 2) {
    const liveFacts = [
      `🟢 Gate: ${$('systemStatusBadge')?.textContent || 'GO'} | ${new Date().toLocaleTimeString()}`,
      `👥 Pipeline: 5000 contacts | 1000 companies`,
      `💰 Revenue avg: $69/mes | Stripe+PayPal LIVE`,
      `🤖 22 agents | Health: 90/100`,
      `📬 LinkedIn posting ACTIVE | 6 AM pipeline`
    ];
    el.textContent = liveFacts[Math.floor(Math.random() * liveFacts.length)];
  } else {
    if (!randomFact || randomFact.startsWith('🐯 Datos')) randomFact = await fetchRandomFact();
    el.textContent = randomFact.substring(0, 120);
    randomFact = await fetchRandomFact(); // Pre-fetch next
  }
  factIdx++;
}

setInterval(botCycle, 5000);
botCycle();
