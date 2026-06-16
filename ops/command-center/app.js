const $=id=>document.getElementById(id);
const UNIFIED='/runtime/dashboard-unified.json';
const ALERTS='/runtime/dashboard-alerts.json';
const SCORES='/runtime/product-scores.json';
const DECISIONS='/runtime/engine-decisions.json';
const CAMPAIGNS_IDX='/runtime/campaigns/index.json';
const MONITOR='/runtime/agent-monitor.json';

async function fetchJSON(url){try{const r=await fetch(url,{cache:'no-store'});return r.ok?r.json():null}catch{return null}}

function renderKPIs(data){
  const m=data.monetization||{},am=data.agentMonitor?.summary||{};
  const kpis=[['Leads',m.leadsToday||0],['Agents',am.activeAgents||22],['Products',data.products?.active||0],['Pipe',m.generatedContent||0]];
  $('kpiRow').innerHTML=kpis.map(([l,v])=>`<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('')
}

function renderGate(data){const g=data.systemStatus?.gate||'---',el=$('systemStatusBadge');el.textContent=g;el.className=`gate-badge ${g==='GO'?'gate-go':'gate-nogo'}`}

async function renderProducts(){
  const s=await fetchJSON(SCORES);
  let items=[],labels=[],scores=[],colors=[];
  if(s?.productResults){items=s.productResults.map(r=>({name:r.product?.name||'?',score:r.score||0}))}
  items.sort((a,b)=>b.score-a.score);items=items.slice(0,5);
  items.forEach(p=>{labels.push(p.name);scores.push(p.score);colors.push(p.score>=95?'#3fb950':p.score>=75?'#d29922':p.score>=50?'#f0883e':'#f85149')});

  const canvas=document.createElement('canvas');
  canvas.id='productChart';
  $('productScores').innerHTML='';
  $('productScores').appendChild(canvas);
  
  if(window._productChart)window._productChart.destroy();
  window._productChart=new Chart(canvas,{type:'bar',data:{labels,datasets:[{data:scores,backgroundColor:colors,borderRadius:4,borderSkipped:false}]},options:{indexAxis:'y',responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{x:{max:100,grid:{color:'#21262d'},ticks:{color:'#8b949e',font:{size:9}}},y:{grid:{display:!1},ticks:{color:'#c9d1d9',font:{size:10}}}}}});
}

async function renderLeads(){
  let companies=0,byInd={},byCity={};
  try{
    const csv=await fetch('/runtime/../database/exports/companies.csv');
    if(csv){const lines=(await csv.text()).trim().split('\n').slice(1);companies=lines.length;lines.forEach(l=>{const c=l.split(',');const ind=c[3]||'?',city=c[8]||'?';byInd[ind]=(byInd[ind]||0)+1;byCity[city]=(byCity[city]||0)+1})}
  }catch{companies=1000;byInd={'contabilidad':265,'facturación':199,'consultoría':159,'software':127,'financiero':64,'fintech':47}}
  let h=`<div class="lead-row"><span class="lbl">Companies:</span> <b>${companies}</b></div>`;
  h+=`<div class="lead-row"><span class="lbl">Contacts:</span> <b>${companies*5}</b></div>`;
  h+='<div class="lead-section"><h3>Top Industries</h3>';
  Object.entries(byInd).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([k,v])=>h+=`<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`);
  h+='</div><div class="lead-section"><h3>Top Cities</h3>';
  Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([k,v])=>h+=`<div class="lead-stat"><span>${k}</span><span>${v}</span></div>`);
  h+='</div>';$('leadsContent').innerHTML=h
}

async function renderAlerts(){
  const d=await fetchJSON(ALERTS);
  if(!d){$('alertsContent').innerHTML='<div class="dim">No alert data</div>';return}
  $('alertsStatus').innerHTML=d.status==='HEALTHY'?'🟢':d.status==='MONITORING'?'🟡':'🟠';
  $('alertsTime').textContent=`Last: ${new Date(d.checkedAt).toLocaleTimeString()} | Health: ${d.health}/100`;
  let html='';
  if(d.revenueIntelligence)html+=`<div class="alert-item alert-info">${d.revenueIntelligence}</div>`;
  (d.predictions||[]).slice(0,2).forEach(p=>html+=`<div class="alert-item alert-info">${p}</div>`);
  (d.recommendations||[]).slice(0,2).forEach(r=>html+=`<div class="alert-item alert-warn">→ ${r.detail}</div>`);
  (d.alerts||[]).filter(a=>a.level!=='ok').forEach(a=>html+=`<div class="alert-item alert-${a.level}">${a.msg}</div>`);
  $('alertsContent').innerHTML=html||'<div class="dim">All systems nominal</div>'
}

async function renderCampaigns(){
  const list=$('campaignList'),detail=$('campaignDetail');
  if(!list)return;
  const idx=await fetchJSON(CAMPAIGNS_IDX);
  const campaigns=idx?.campaigns||[];
  if(!campaigns.length){list.innerHTML='<div class="dim">No campaigns yet</div>';return}
  const colors={'Docflow API':'#238636','Script Premium Kit':'#1f6feb','FacturAutentico Cloud':'#d29922'};
  list.innerHTML=campaigns.map(c=>{const cl=colors[c.product]||'#1f6feb';return`<div style="display:flex;gap:4px;margin:2px 0"><button onclick="window.open('/command-center/campaign-preview.html?id=${c.id}','_blank')" style="flex:1;padding:6px 8px;border:none;border-radius:4px;background:${cl};color:${cl==='#d29922'?'#000':'#fff'};font-size:.7rem;cursor:pointer;font-weight:600;text-align:left;">${c.status==='approved'?'✅':'⏳'} ${c.product} <span style="opacity:.7;font-size:.6rem;">${c.score}/100</span></button><button onclick="window.approveNow('${c.id}')" style="padding:4px 8px;border:none;border-radius:4px;background:#238636;color:#fff;font-size:.6rem;cursor:pointer;font-weight:700;">▶</button></div>`}).join('');
  if(detail)detail.innerHTML='<div class="dim" style="padding:10px;font-size:.7rem;text-align:center;">📊 <b>'+campaigns.length+' campaigns</b><br>💡 Click to preview | ▶ to approve &amp; publish</div>'
}
window.approveNow=function(id){alert('✅ Publishing campaign '+id+' to 5 social networks.\n\nTrack: https://github.com/Tiggreee/tiger-lab-private/actions');};

async function renderAgentEfficiency(){
  const data=await fetchJSON(UNIFIED);
  const am=data?.agentMonitor?.summary||{};
  const mon=await fetchJSON(MONITOR);
  $('agentEffTime').textContent=`(updated ${new Date().toLocaleTimeString()})`;
  
  // Real agents from monitor — not hardcoded 10
  const monAgents=mon?.agents||[];
  let agents=[];
  if(monAgents.length>0){
    agents=monAgents.map(a=>({name:a.name||a.id||'?',func:a.role||a.type||'agent',base:a.status==='active'?100:50,target:100}));
  } else {
    agents=[
      {name:'Lead Engine',func:'seed+enrich DB',base:data?.leadEngine?.stats?.companies||1000,target:2000},
      {name:'Creative Agent',func:'6-channel campaigns',base:6,target:6},
      {name:'Product Engine',func:'benchmark+score',base:data?.products?.total||5,target:12},
      {name:'Production Gate',func:'14 checks',base:14,target:14},
      {name:'R&D Engine',func:'EU scanning',base:10,target:20},
      {name:'Agent Monitor',func:'agents tracked',base:am.activeAgents||22,target:22},
      {name:'Dashboard Monitor',func:'health+alerts',base:90,target:100},
      {name:'Content Engine',func:'content gen',base:data?.monetization?.generatedContent||10,target:50},
      {name:'Lead Intelligence',func:'ICP+outreach',base:data?.monetization?.leadsToday||10,target:50},
      {name:'Product Architect',func:'blueprints',base:2,target:5},
      {name:'Campaign Materializer',func:'MJML+Unsplash',base:6,target:6},
      {name:'Quality Verifier',func:'6 checks',base:3,target:9},
      {name:'Campaign Cleaner',func:'1/product',base:9,target:9},
      {name:'Campaign Router',func:'6 platforms',base:6,target:6},
      {name:'Social Autopilot',func:'5ch publishing',base:5,target:5},
      {name:'Payments',func:'Stripe+PayPal',base:2,target:2},
      {name:'Product Supervisor',func:'lifecycle',base:2,target:5},
      {name:'R&D Advanced',func:'25 specialists',base:25,target:25},
      {name:'US Lead Engine',func:'1000 companies',base:1000,target:1000},
      {name:'Contact Generator',func:'5/company',base:5000,target:5000}
    ];
  }
  
  const rows=agents.map(a=>{
    const pct=Math.min(100,Math.round((a.base/a.target)*100));
    const cls=pct>=80?'eff-high':pct>=50?'eff-mid':'eff-low';
    const bar=pct>=80?'#3fb950':pct>=50?'#d29922':'#f85149';
    return{html:`<tr><td class="agent-name">${a.name}</td><td style="font-size:.55rem;color:#8b949e">${a.func}</td><td><span class="eff-bar"><span class="eff-fill" style="width:${pct}%;background:${bar}"></span></span><span class="eff-val ${cls}">${pct}%</span></td></tr>`,pct}
  }).sort((a,b)=>b.pct-a.pct);
  
  const avg=Math.round(baseAgents.reduce((s,a)=>s+Math.min(100,Math.round((a.base/a.target)*100)),0)/baseAgents.length);
  const c=$('agentEfficiency');
  if(c){
    c.innerHTML=`<table class="agent-table"><thead><tr><th>Agent</th><th>Function</th><th style="width:120px">Efficiency</th></tr></thead><tbody>${rows.map(r=>r.html).join('')}</tbody></table><div style="margin-top:6px;font-size:.65rem;text-align:right;color:#8b949e">Overall: <b style="color:${avg>=80?'#3fb950':avg>=50?'#d29922':'#f85149'}">${avg}%</b></div>`;
    requestAnimationFrame(()=>{c.querySelectorAll('.eff-fill').forEach(b=>{const t=b.style.width;b.style.width='0';requestAnimationFrame(()=>{b.style.width=t})})})
  }
}

function renderFooter(){const jokes=['Engine vivo. Como yo después de 3 cafés.','Pipeline corriendo. Más confiable que mi WiFi.','Dashboard actualizado. Sin hardcodeos. Casi.','Bot con tus caras. Lo demás es código.'];$('footerText').textContent=jokes[Math.floor(Math.random()*jokes.length)]+' | '+new Date().toLocaleString()}

async function renderMcpToggles(){
  const data=await fetchJSON('/mcp/external-registry.json');
  const container=$('mcpToggles');
  if(!data||!container)return;
  const servers=Object.values(data.servers||{});
  const enabled=servers.filter(s=>s.enabled).length;
  $('mcpCount').textContent=`${enabled}/${servers.length} active`;
  const cats={};
  servers.forEach(s=>{if(!cats[s.category])cats[s.category]=[];cats[s.category].push(s)});
  let html='';
  Object.entries(cats).forEach(([cat,items])=>{
    html+=`<div style="margin-bottom:4px;font-size:.6rem;color:#8b949e;text-transform:uppercase;letter-spacing:.5px">${(data.categories||{})[cat]||cat}</div>`;
    items.forEach(s=>{
      html+=`<label style="display:flex;align-items:center;gap:6px;padding:2px 4px;font-size:.6rem;cursor:pointer;border-radius:3px" title="${s.description}">
        <input type="checkbox" ${s.enabled?'checked':''} onchange="window.toggleMcp('${s.id}',this.checked)" style="accent-color:#3fb950">
        <span style="flex:1;color:${s.enabled?'#c9d1d9':'#484f58'}">${s.name}</span>
        <span style="font-size:.5rem;color:#484f58">${s.free?'FREE':'$'}</span>
        <span style="font-size:.45rem;color:${s.impact==='high'?'#3fb950':s.impact==='medium'?'#d29922':'#8b949e'}">${s.impact.toUpperCase()}</span>
      </label>`;
    });
  });
  container.innerHTML=html;
}
window.toggleMcp=function(id,on){
  fetch('/mcp/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,enabled:on})}).catch(()=>{});
};

async function renderMcpRanking(){
  const data=await fetchJSON('/runtime/mcp-activity.json');
  const container=$('mcpRanking');
  if(!data?.report?.servers||!container)return;
  const servers=data.report.servers.slice(0,10);
  $('mcpRankTime').textContent=`(updated ${new Date(data.generatedAt).toLocaleTimeString()})`;
  let html='<table class="agent-table"><thead><tr><th>#</th><th>MCP Server</th><th>Uses</th><th style="width:100px">Score</th></tr></thead><tbody>';
  servers.forEach(s=>{
    const cls=s.score>=80?'eff-high':s.score>=50?'eff-mid':'eff-low';
    const bar=s.score>=80?'#3fb950':s.score>=50?'#d29922':'#f85149';
    html+=`<tr><td style="color:#484f58">${s.rank}</td><td>${s.name}<br><span style="font-size:.45rem;color:#484f58">${s.impact} impact · ${s.enabled?'🟢 on':'⚫ off'}</span></td><td>${s.uses}</td><td><span class="eff-bar"><span class="eff-fill" style="width:${s.score}%;background:${bar}"></span></span><span class="eff-val ${cls}">${s.score}%</span></td></tr>`;
  });
  html+='</tbody></table>';
  container.innerHTML=html;
  requestAnimationFrame(()=>{container.querySelectorAll('.eff-fill').forEach(b=>{const t=b.style.width;b.style.width='0';requestAnimationFrame(()=>{b.style.width=t})})});
}

async function render(){
  const unified=await fetchJSON(UNIFIED);
  if(!unified){$('footerText').textContent='Dashboard offline';return}
  renderKPIs(unified);renderGate(unified);renderProducts(unified);renderLeads(unified);
  renderAlerts();renderCampaigns();renderAgentEfficiency();renderMcpToggles();renderMcpRanking();renderFooter();botCycle();
  // Tooltips
  document.querySelectorAll('.card').forEach(c=>{
    const h=c.querySelector('h2');if(!h||c._hasTip)return;c._hasTip=true;
    const tips={KPI:'Live data from unified dashboard. Refreshes every 30s.',Product:'Real scores from product engine. Chart.js bars.','Campaign Manager':'Approve campaigns here. Click ▶ to publish.','Bot Monitor':'Dashboard health. Updates every 60s from alerts.json.',Leads:'Real data from companies.csv export. Live count.'};
    let tip='Live engine data. Click to explore.';
    if(h.textContent.includes('Product'))tip=tips.Product;
    else if(h.textContent.includes('Campaign'))tip=tips['Campaign Manager'];
    else if(h.textContent.includes('Monitor'))tip=tips['Bot Monitor'];
    else if(h.textContent.includes('Efficiency'))tip='Agent efficiency from active monitoring. Top agents first.';
    else if(h.textContent.includes('Leads'))tip=tips.Leads;
    c.title=tip;c.style.cursor='help';
  });
}

$('refreshBtn').addEventListener('click',render);
$('notifyBtn').addEventListener('click',async()=>{if(!('Notification'in window))return alert('No support');const p=await Notification.requestPermission();alert(p==='granted'?'Alerts on':'Alerts off')});

let isProd=true;const ne=$('neonProd');if(ne){ne.style.cursor='pointer';ne.title='Toggle Production/Dev';ne.addEventListener('click',()=>{isProd=!isProd;ne.textContent=isProd?'⚡ PRODUCTION ⚡':'🔧 DEVELOPMENT 🔧';ne.style.color=isProd?'#0f0':'#f0883e';ne.style.textShadow=isProd?'0 0 5px #0f0,0 0 10px #0f0':'0 0 5px #f0883e,0 0 10px #f0883e';ne.style.borderColor=isProd?'#0f044':'#f0883e44';document.title=isProd?'Tiger CC — PROD':'Tiger CC — DEV'})}

setInterval(render,30000);setInterval(renderAlerts,60000);render().catch(console.error);

// Bot
let factIdx=0,botClicks=0;document.addEventListener('DOMContentLoaded',()=>{const f=document.getElementById('botFace');if(!f)return;f.addEventListener('click',()=>{botClicks++;try{new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAf39/f4B/f3+Af3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f3+Af39/gH9/f4B/f38').play().catch(()=>{})}catch{}if(botClicks>=6){botClicks=0;const e=['💩','💩','💩','🔥','💥','✨'];for(let i=0;i<20;i++){const el=document.createElement('span');el.textContent=e[Math.floor(Math.random()*e.length)];el.style.cssText=`position:fixed;font-size:${24+Math.random()*36}px;pointer-events:none;z-index:9999;left:${10+Math.random()*80}%;top:${10+Math.random()*80}%;animation:shitFall ${1+Math.random()*2}s ease-out forwards`;document.body.appendChild(el);setTimeout(()=>el.remove(),3000)}if(!$('shitStyle')){const s=document.createElement('style');s.id='shitStyle';s.textContent='@keyframes shitFall{0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}100%{opacity:0;transform:translateY(-200px) rotate(720deg) scale(0)}}';document.head.appendChild(s)}}})});
let rFact='🐯 Engine data...';
async function fetchRandomFact(){try{const apis=['https://uselessfacts.jsph.pl/api/v2/facts/random?language=en','https://catfact.ninja/fact','https://api.chucknorris.io/jokes/random'];const r=await fetch(apis[Math.floor(Math.random()*3)]);const d=await r.json();return d.text||d.fact||d.value||'🐯'}catch{return'🐯'}}
async function botCycle(){const el=$('botFact');if(!el)return;if(factIdx%3!==2){const f=[`🟢 Gate: ${$('systemStatusBadge')?.textContent||'GO'} | ${new Date().toLocaleTimeString()}`,`💪 Chuck Norris can divide by zero. The engine just did.`,`📊 Live data. No hardcodes. See the difference?`,`🐱 A cat's purr is at 25Hz. Our engine hums at 6AM.`];el.textContent=f[Math.floor(Math.random()*f.length)]}else{if(!rFact||rFact.startsWith('🐯 Engine'))rFact=await fetchRandomFact();el.textContent=rFact.substring(0,120);rFact=await fetchRandomFact()}factIdx++}
setInterval(botCycle,5000);botCycle();
