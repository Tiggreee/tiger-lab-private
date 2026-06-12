const UNIFIED_URL = '/runtime/dashboard-unified.json';
const AGENT_MONITOR_URL = '/runtime/agent-monitor.json';
const TASKS_URL = '/command-center/tasks.json';
const DECISIONS_URL = '/command-center/decisions.json';
const PRIORITIZATION_URL = '/runtime/dashboard-prioritization-report.json';
const LEADS_URL = '/leads/pipeline.json';
const LANDINGS_URL = '/landings/index.json';

const els = {
  metrics: document.getElementById('metrics'),
  kpiGrid: document.getElementById('kpiGrid'),
  funnelStages: document.getElementById('funnelStages'),
  humanTasks: document.getElementById('humanTasks'),
  aiTasks: document.getElementById('aiTasks'),
  allTasks: document.getElementById('allTasks'),
  productsList: document.getElementById('productsList'),
  decisionsList: document.getElementById('decisionsList'),
  decisionsCount: document.getElementById('decisionsCount'),
  agentFocus: document.getElementById('agentFocus'),
  agentStatus: document.getElementById('agentStatus'),
  leadList: document.getElementById('leadList'),
  leadCount: document.getElementById('leadCount'),
  campaignList: document.getElementById('campaignList'),
  campaignCount: document.getElementById('campaignCount'),
  botList: document.getElementById('botList'),
  botCount: document.getElementById('botCount'),
  notifyBtn: document.getElementById('notifyBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  priorityFilter: document.getElementById('priorityFilter'),
  ownerFilter: document.getElementById('ownerFilter'),
  footerText: document.getElementById('footerText'),
  systemStatusBadge: document.getElementById('systemStatusBadge'),
  devopsList: document.getElementById('devopsList'),
  devopsCount: document.getElementById('devopsCount')
};

function daysUntil(dateISO) {
  const now = new Date();
  const due = new Date(`${dateISO}T23:59:59`);
  const ms = due.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function statusClass(task) {
  const d = daysUntil(task.dueDate);
  if (task.status === 'done') return 'on-track';
  if (d < 0) return 'overdue';
  if (d <= 2) return 'due-soon';
  return 'on-track';
}

function urgencyText(task) {
  const d = daysUntil(task.dueDate);
  if (task.status === 'done') return 'Done';
  if (d < 0) return `Overdue by ${Math.abs(d)} day(s)`;
  if (d === 0) return 'Due today';
  return `Due in ${d} day(s)`;
}

function createTaskNode(task) {
  const li = document.createElement('li');
  li.className = `task ${statusClass(task)}`;
  li.innerHTML = `
    <h3>${task.title}</h3>
    <p>
      <span class="badge">${task.priority}</span>
      <span class="badge">${task.owner === 'human' ? 'You' : 'AI'}</span>
      <span class="badge">${task.area}</span>
    </p>
    <p><b>Status:</b> ${task.status}</p>
    <p><b>Due:</b> ${task.dueDate} (${urgencyText(task)})</p>
    <p><b>Next action:</b> ${task.nextAction}</p>
  `;
  return li;
}

function createTaskRegistry() {
  const registry = document.getElementById('taskRegistry');
  if (!registry) return;
  (async () => {
    const data = await loadJSON(TASKS_URL);
    if (!data || !data.tasks) { registry.innerHTML = '<li class="task">No tasks data</li>'; return; }
    let html = `<li class="task on-track"><p>Total: ${data.tasks.length} | Done: ${data.tasks.filter(t => t.status === 'done').length} | Pending: ${data.tasks.filter(t => t.status !== 'done').length}</p></li>`;
    data.tasks.forEach((task, i) => {
      const sc = statusClass(task);
      html += `<li class="task ${sc}">
        <h3>#${i + 1}. ${task.id} — ${task.title}</h3>
        <p><span class="badge">${task.priority}</span><span class="badge">${task.owner}</span><span class="badge">${task.area}</span><span class="badge">${task.status}</span></p>
        <p><b>Due:</b> ${task.dueDate} (${urgencyText(task)})</p>
        <p><b>Action:</b> ${task.nextAction}</p>
        ${task.evidence ? `<p>Evidence: ${task.evidence}</p>` : ''}
        ${task.blocker ? `<p>Blocker: ${task.blocker}</p>` : ''}
      </li>`;
    });
    registry.innerHTML = html;
  })();
}

function renderMetrics(data) {
  const tasks = data.tasks?.items || [];
  const active = tasks.filter(t => t.status !== 'done');
  const overdue = active.filter(t => daysUntil(t.dueDate) < 0);
  const dueSoon = active.filter(t => { const d = daysUntil(t.dueDate); return d >= 0 && d <= 2; });
  const humanPending = active.filter(t => t.owner === 'human');
  const cards = [
    ['Active Tasks', active.length],
    ['Overdue', overdue.length],
    ['Due in 48h', dueSoon.length],
    ['Your Pending', humanPending.length],
    ['Products', data.products?.active || 0],
    ['Campaigns', data.campaigns?.total || 0],
    ['Agents', data.agentMonitor?.summary?.activeAgents || 0],
    ['Bots', (data.bots?.active?.length || 0) + (data.bots?.paperPending?.length || 0)]
  ];
  els.metrics.innerHTML = '';
  cards.forEach(([label, value]) => {
    const div = document.createElement('div');
    div.className = 'metric';
    div.innerHTML = `<small>${label}</small><b>${value}</b>`;
    els.metrics.appendChild(div);
  });

  if (els.systemStatusBadge) {
    const gate = data.systemStatus?.gate || 'UNKNOWN';
    els.systemStatusBadge.textContent = `Gate: ${gate}`;
    els.systemStatusBadge.className = `badge ${gate === 'GO' ? 'badge-go' : 'badge-nogo'}`;
  }
}

function renderKPIs(data) {
  if (!els.kpiGrid) return;
  const m = data.monetization || {};
  const html = [
    { label: 'Leads Today', value: m.leadsToday ?? 0 },
    { label: 'Content Generated', value: m.generatedContent ?? 0 },
    { label: 'Active Bots', value: m.activeBots ?? 0 },
    { label: 'Average Price', value: m.averagePrice ?? '$0' }
  ].map(k => `<div class="kpi-card"><small>${k.label}</small><b>${k.value}</b></div>`).join('');
  els.kpiGrid.innerHTML = html;
}

function renderFunnel(data) {
  if (!els.funnelStages) return;
  const funnel = data.funnel || { stages: [], activeStage: 'Lead' };
  const stages = ['Visit', 'Lead', 'Trial', 'Checkout', 'Paid'];
  const activeIdx = stages.indexOf(funnel.activeStage);
  const html = stages.map((s, i) => {
    const activeClass = i <= activeIdx ? 'funnel-active' : 'funnel-inactive';
    return `<div class="funnel-stage ${activeClass}"><span>${s}</span></div>`;
  }).join('');
  els.funnelStages.innerHTML = html;
}

function renderProducts(data) {
  if (!els.productsList) return;
  const products = data.products?.items || [];
  if (!products.length) { els.productsList.innerHTML = '<li class="task">No products</li>'; return; }
  let html = `<li class="task on-track"><p><b>${data.products.active} active</b> · ${data.products.paused} paused · ${data.products.planned} planned</p></li>`;
  products.forEach(p => {
    const cls = p.status === 'active' ? 'on-track' : p.status === 'paused' ? 'due-soon' : 'overdue';
    html += `<li class="task ${cls}"><p><b>${p.name}</b> — ${p.status} | ${p.plans}</p></li>`;
  });
  els.productsList.innerHTML = html;
}

function renderCampaigns(data) {
  if (!els.campaignList) return;
  const camps = data.campaigns?.recent || [];
  els.campaignCount.textContent = data.campaigns?.total || 0;
  if (!camps.length) { els.campaignList.innerHTML = '<li class="task">No campaigns</li>'; return; }
  const html = camps.map(c => `<li class="task on-track">
    <p><b>${c.name}</b> <span class="badge">${c.avgScore} score</span> <span class="badge">${c.projectedLift}% lift</span></p>
    <p>Topic: ${c.topic} | Channels: ${c.channels.join(', ')} | MCP: ${c.mcpDecision}</p>
  </li>`).join('');
  els.campaignList.innerHTML = html;
}

function renderBots(data) {
  if (!els.botList) return;
  const bots = data.bots || { active: [], paperPending: [] };
  els.botCount.textContent = bots.active.length;
  let html = `<li class="task on-track"><p><b>${bots.active.length} active</b> · ${bots.paperPending.length} paper pending</p></li>`;
  bots.active.forEach(b => { html += `<li class="task on-track"><p>🟢 ${b}</p></li>`; });
  bots.paperPending.forEach(b => { html += `<li class="task due-soon"><p>📄 ${b} (paper — needs wiring)</p></li>`; });
  els.botList.innerHTML = html;
}

function renderDevops(data) {
  if (!els.devopsList) return;
  const dev = data.development || { gaps: [], finishedProducts: [] };
  const critical = dev.gaps.filter(g => g.severity === 'critical').length;
  const high = dev.gaps.filter(g => g.severity === 'high').length;
  els.devopsCount.textContent = `${dev.gaps.length} gaps`;
  let html = `<li class="task due-soon"><p><b>${dev.gaps.length} gaps</b> (${critical} critical, ${high} high)</p></li>`;
  dev.gaps.forEach(g => {
    const cls = g.severity === 'critical' ? 'overdue' : g.severity === 'high' ? 'due-soon' : 'on-track';
    html += `<li class="task ${cls}"><p><b>${g.severity.toUpperCase()}</b> ${g.title} ${g.requiresHuman ? '🧑' : '🤖'}</p><p>${g.detail}</p></li>`;
  });
  if (dev.finishedProducts.length) {
    html += `<li class="task on-track"><p><b>Finished products:</b> ${dev.finishedProducts.map(p => p.name).join(', ')}</p></li>`;
  }
  els.devopsList.innerHTML = html;
}

function renderDecisions(decisions) {
  if (!decisions || !decisions.result || !decisions.result.report) {
    if (els.decisionsList) els.decisionsList.innerHTML = '<li class="task">No decision data</li>';
    if (els.decisionsCount) els.decisionsCount.textContent = '0';
    return;
  }
  const report = decisions.result.report;
  els.decisionsCount.textContent = report.totalProducts;
  let html = `<li class="task on-track">
    <h3>Supervisor Report</h3>
    <p><span class="badge">${report.activeProducts} Active</span><span class="badge">${report.flaggedProducts} Flagged</span><span class="badge">${report.retiredProducts} Retired</span></p>
  </li>`;
  if (report.recommendations) report.recommendations.forEach(r => { html += `<li class="task due-soon"><p>${r}</p></li>`; });
  els.decisionsList.innerHTML = html;
}

function renderAgentPanel(report) {
  if (!report || !report.recommendedFocus) {
    if (els.agentFocus) els.agentFocus.innerHTML = '<li class="task">No prioritization data</li>';
    return;
  }
  let html = `<li class="task on-track"><p>Revisado: ${new Date(report.prioritizedAt).toLocaleString()} | Activas: ${report.totalActive} | Vencidas: ${report.overdueCount}</p></li>`;
  if (report.recommendedFocus.length > 0) {
    html += `<li class="task due-soon"><h3>Recommended Focus</h3>`;
    report.recommendedFocus.forEach((r, i) => { html += `<p>${i + 1}. ${r}</p>`; });
    html += `</li>`;
  }
  els.agentFocus.innerHTML = html;
}

function renderLeadPanel(pipeline) {
  if (!pipeline || !pipeline.stats) {
    if (els.leadList) els.leadList.innerHTML = '<li class="task">No lead data</li>';
    if (els.leadCount) els.leadCount.textContent = '0';
    return;
  }
  els.leadCount.textContent = pipeline.stats.total;
  let html = `<li class="task on-track">
    <p>Pipeline: ${pipeline.stats.total} leads</p>
    <p><span class="badge">${pipeline.stats.new || 0} new</span><span class="badge">${pipeline.stats.contacted || 0} contacted</span></p>
  </li>`;
  if (pipeline.leads) {
    pipeline.leads.slice(-3).reverse().forEach(l => {
      html += `<li class="task due-soon"><p><b>${l.name}</b> — ${l.company} <span class="badge">${l.industry}</span><br>${l.pain}</p></li>`;
    });
  }
  els.leadList.innerHTML = html;
}

function renderLandingsPanel(landings) {
  const list = document.getElementById('landingsList');
  if (!list) return;
  if (!landings || !landings.summary) { list.innerHTML = '<li class="task">No landing data</li>'; return; }
  const s = landings.summary;
  let html = `<li class="task on-track"><p>${s.totalLandingPages} landings · ${s.totalProducts} products · ${s.channelsUsed.join(', ')}</p></li>`;
  for (const [pid, info] of Object.entries(landings.products)) {
    html += `<li class="task ${info.status === 'active' ? 'on-track' : 'due-soon'}"><p>${info.status === 'active' ? '🟢' : '⏸️'} <b>${info.product}</b> — ${info.channels.join(', ')}</p></li>`;
  }
  list.innerHTML = html;
}

function renderAgentMonitor(monitor) {
  const list = document.getElementById('agentMonitorList');
  if (!list) return;
  if (!monitor || !monitor.summary) { list.innerHTML = '<li class="task">No agent monitor data</li>'; return; }
  const s = monitor.summary;
  let html = `<li class="task on-track">
    <p>${s.activeAgents === s.totalAgents ? '🟢' : '🟡'} <b>${s.activeAgents}/${s.totalAgents} active</b></p>
    <p><span class="badge">💰 ${s.directMonetization} direct</span><span class="badge">⚙️ ${s.indirectMonetization} indirect</span><span class="badge">🔧 ${s.supportGovernance} support</span></p>
  </li>`;
  for (const agent of monitor.agents) {
    const icon = agent.active ? '🟢' : '🔴';
    const monetIcon = agent.monetizationContribution === 'si' ? '💰' : '🔧';
    html += `<li class="task ${agent.active ? 'on-track' : 'overdue'}">
      <p>${icon} ${monetIcon} <b>${agent.name}</b> <span class="badge">${agent.type}</span></p>
      <p>${agent.active ? 'Activo' : 'Inactivo'} · ${agent.monetizationContribution} (${agent.monetizationType})</p>
      <p>${agent.contributionDetail}</p>
      ${agent.integrationChannels.length ? `<p>${agent.integrationChannels.join(' · ')}</p>` : ''}
    </li>`;
  }
  list.innerHTML = html;
}

function renderLists(tasks) {
  const active = tasks.filter(t => t.status !== 'done');
  const human = active.filter(t => t.owner === 'human');
  const ai = active.filter(t => t.owner === 'ai');
  els.humanTasks.innerHTML = '';
  human.forEach(t => els.humanTasks.appendChild(createTaskNode(t)));
  els.aiTasks.innerHTML = '';
  ai.forEach(t => els.aiTasks.appendChild(createTaskNode(t)));
  const p = els.priorityFilter.value;
  const o = els.ownerFilter.value;
  const filtered = active.filter(t => (p === 'all' || t.priority === p) && (o === 'all' || t.owner === o));
  els.allTasks.innerHTML = '';
  filtered.forEach(t => els.allTasks.appendChild(createTaskNode(t)));
}

function triggerNotification(tasks) {
  const hot = tasks.filter(t => t.status !== 'done' && t.owner === 'human' && daysUntil(t.dueDate) <= 1);
  if (!hot.length) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    const top = hot.slice(0, 2).map(t => t.title).join(' | ');
    new Notification('Tiger Alert', { body: `You have ${hot.length} urgent task(s): ${top}` });
  }
}

async function loadJSON(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch { return null; }
}

async function loadTasks() {
  const response = await fetch(TASKS_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load tasks');
  return response.json();
}

async function loadDecisions() {
  try {
    const response = await fetch(DECISIONS_URL, { cache: 'no-store' });
    if (response.ok) return response.json();
  } catch {}
  try {
    const fallback = await fetch('http://localhost:8787/decisions/report', { cache: 'no-store' }).catch(() => null);
    if (fallback && fallback.ok) return fallback.json();
  } catch {}
  return null;
}

async function render() {
  const [unified, decisionsData, prioritizationData, leadData, landingsData, agentMonitorData] = await Promise.all([
    loadJSON(UNIFIED_URL),
    loadDecisions(),
    loadJSON(PRIORITIZATION_URL),
    loadJSON(LEADS_URL),
    loadJSON(LANDINGS_URL),
    loadJSON(AGENT_MONITOR_URL)
  ]);

  if (!unified) {
    els.footerText.textContent = 'Could not load dashboard data. Run `npm run command-center` first.';
    return;
  }

  renderMetrics(unified);
  renderKPIs(unified);
  renderFunnel(unified);
  renderProducts(unified);
  renderCampaigns(unified);
  renderBots(unified);
  renderDevops(unified);

  const tasks = unified.tasks?.items || [];
  renderLists(tasks);
  createTaskRegistry();
  renderDecisions(decisionsData);
  renderAgentPanel(prioritizationData);
  renderLeadPanel(leadData);
  renderLandingsPanel(landingsData);
  renderAgentMonitor(agentMonitorData);
  renderLeadEnginePanel(unified);
  renderImplTrackerPanel(unified);
  renderProductEnginePanel(unified);
  renderFailuresMonitorPanel(unified);
  renderLedIndicator(unified);
  triggerNotification(tasks);

  const now = new Date().toLocaleString();
  els.footerText.textContent = `Last refresh: ${now} | Data: dashboard-unified.json`;
}

function renderLeadEnginePanel(data) {
  const list = document.getElementById('leadEngineStats');
  const led = document.getElementById('leadEngineLed');
  if (!list) return;
  const le = data.leadEngine?.stats;
  if (!le) { list.innerHTML = '<li class="task">No lead engine data</li>'; return; }
  if (led) {
    const status = data.leadEngine?.ledStatus || 'RED';
    led.textContent = status;
    led.className = `badge ${status === 'GREEN' ? 'badge-go' : status === 'YELLOW' ? 'badge-nogo' : 'badge-nogo'}`;
  }
  const byIndustry = le.byIndustry ? Object.entries(le.byIndustry).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
  const byCity = le.byCity ? Object.entries(le.byCity).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ') : '';
  list.innerHTML = `
    <li class="task on-track">
      <p><b>${le.companies} companies</b> in database</p>
      <p>Sources: ${(le.sources || []).join(', ')}</p>
      <p>Oracle DDL: <a href="/database/oracle-import-ddl.sql" target="_blank">oracle-import-ddl.sql</a></p>
      <p>CSV exports: <a href="/database/exports/" target="_blank">/database/exports/</a></p>
      ${byIndustry ? `<p><b>Top industries:</b> ${byIndustry}</p>` : ''}
      ${byCity ? `<p><b>Top cities:</b> ${byCity}</p>` : ''}
    </li>
    <li class="task on-track">
      <p><b>Commands:</b></p>
      <p><code>node scripts/lead-engine.mjs --mode seed</code> — load seed data</p>
      <p><code>node scripts/lead-engine.mjs --mode enrich</code> — enrich via OSM</p>
      <p><code>node scripts/lead-engine.mjs --mode export</code> — CSV for Oracle</p>
    </li>`;
}

function renderImplTrackerPanel(data) {
  const list = document.getElementById('implTrackerStats');
  const badge = document.getElementById('implPercent');
  if (!list) return;
  const impl = data.implementationTracker?.summary;
  if (!impl) { list.innerHTML = '<li class="task">No implementation data</li>'; return; }
  if (badge) {
    badge.textContent = `${impl.implementationPercent}% impl`;
    badge.className = `badge ${impl.implementationPercent >= 80 ? 'badge-go' : impl.implementationPercent >= 50 ? 'badge-nogo' : 'badge-nogo'}`;
  }
  const credit = data.implementationTracker?.githubCredits || {};
  list.innerHTML = `
    <li class="task on-track">
      <p><b>${impl.totalScripts} scripts</b> · ${impl.productionScripts} prod · ${impl.connectedScripts} connected · ${impl.localOnlyScripts} local · ${impl.toyScripts} toy</p>
      <p>Implementation: <b>${impl.implementationPercent}%</b> · Connected: <b>${impl.connectedPercent}%</b> · Viability: <b>${impl.engineViability}</b></p>
      <p>DB: ${impl.database.companies} companies · ${impl.database.contacts} contacts · ${impl.database.leads} leads</p>
      <p>Git: ${impl.gitCommits} commits · ${impl.workflows} workflows · ${impl.agents} agents · ${impl.bots} bots</p>
    </li>
    <li class="task on-track">
      <p><b>GitHub Credits (monthly):</b></p>
      <p>Actions: ${credit.actionsMinutes?.used || 0}/${credit.actionsMinutes?.limit || 50000} min (${credit.actionsMinutes?.status || 'GREEN'})</p>
      <p>Startups Budget: ${credit.startupsBudget?.used || '$0'}/${credit.startupsBudget?.limit || '$4,982.40'} (${credit.startupsBudget?.status || 'GREEN'})</p>
      <p>${credit.note || ''}</p>
    </li>`;
}

function renderProductEnginePanel(data) {
  const list = document.getElementById('prodEngineStats');
  const badge = document.getElementById('prodEngineAvg');
  if (!list) return;
  const pe = data.productEngine;
  if (!pe) { list.innerHTML = '<li class="task">No product engine data</li>'; return; }
  if (badge) {
    badge.textContent = `${pe.engine.averageScore} avg`;
    badge.className = `badge ${pe.engine.averageScore >= 80 ? 'badge-go' : pe.engine.averageScore >= 50 ? 'badge-nogo' : 'badge-nogo'}`;
  }
  const top = pe.topProducts || [];
  const pq = pe.priorityQueue || {};
  list.innerHTML = `
    <li class="task on-track">
      <p><b>${pe.engine.averageScore}/100 avg</b> · ${pe.engine.productsAt95} at 95% · ${pe.engine.productsAt75plus} at 75%+</p>
      <p><b>Benchmarks:</b> ${pe.engine.totalBenchmarks} categories · ${pe.engine.totalCompetitors} competitors analyzed</p>
      <p><b>Total effort:</b> ${pe.engine.estimatedTotalEffortHours}h (${Math.ceil(pe.engine.estimatedTotalEffortHours / 8)} sprints)</p>
    </li>
    <li class="task on-track">
      <p><b>Products by score:</b></p>
      ${top.map(p => `<p>${p.score >= 95 ? '🟢' : p.score >= 75 ? '🟡' : '🔴'} <b>${p.name}</b> — ${p.score}/100 [${p.tier}] ${p.status}</p>`).join('')}
    </li>
    <li class="task on-track">
      <p><b>Priority queue:</b></p>
      ${pq.engineReady && pq.engineReady.length ? `<p>🟢 Engine Ready: ${pq.engineReady.join(', ')}</p>` : '<p>🔴 No products engine-ready yet</p>'}
      ${pq.target95 && pq.target95.length ? `<p>🎯 Push to 95%: ${pq.target95.join(', ')}</p>` : ''}
    </li>
    <li class="task on-track">
      <p><b>Cycle:</b> <code>npm run prod:engine</code> · <code>.github/workflows/product-engine-2h-cycle.yml</code></p>
      <p><b>Data:</b> <a href="/runtime/product-scores.json" target="_blank">product-scores.json</a> · <a href="/runtime/product-roadmaps.json" target="_blank">product-roadmaps.json</a></p>
    </li>`;
}

function renderFailuresMonitorPanel(data) {
  const list = document.getElementById('failuresMonitorStats');
  const badge = document.getElementById('failuresCount');
  if (!list) return;
  const fm = data.failuresMonitor;
  if (!fm) { list.innerHTML = '<li class="task">No failures monitor data</li>'; return; }
  if (badge) {
    badge.textContent = `${fm.failedToday} failed`;
    badge.className = `badge ${fm.failedToday === 0 ? 'badge-go' : 'badge-nogo'}`;
  }
  const wfHtml = (fm.byWorkflow || []).slice(0, 8).map(w =>
    `<p>${w.workflow}: ${w.failures} failures</p>`
  ).join('');
  const rcHtml = (fm.rootCauses || []).map(rc =>
    `<p><span class="badge ${rc.severity === 'fixed' ? 'badge-go' : 'badge-nogo'}">${rc.severity}</span> ${rc.cause}</p>`
  ).join('');
  list.innerHTML = `
    <li class="task on-track">
      <p><b>${fm.totalRuns} runs analyzed</b> · ${fm.failedToday} failed · ${fm.successfulToday} successful</p>
      <p><b>Permission:</b> ${fm.currentPermission || 'UNKNOWN'} ${fm.permFixed ? '(FIXED)' : ''}</p>
      ${rcHtml}
    </li>
    <li class="task on-track">
      <p><b>Failures by workflow:</b></p>
      ${wfHtml || '<p>None</p>'}
    </li>
    <li class="task on-track">
      <p><b>Cycle:</b> <code>.github/workflows/failures-monitor-2h-cycle.yml</code></p>
      <p><b>Data:</b> <a href="/runtime/failures-history.json" target="_blank">failures-history.json</a></p>
    </li>`;
}

function renderLedIndicator(data) {
  const led = document.getElementById('engineLed');
  if (!led) return;
  const implOk = data.implementationTracker?.summary?.implementationPercent >= 80;
  const dbOk = (data.leadEngine?.stats?.companies || 0) > 0;
  const gateOk = data.systemStatus?.gate === 'GO';
  const prodOk = (data.productEngine?.engine?.averageScore || 0) >= 70;
  const engineHealthy = implOk && dbOk && gateOk && prodOk;
  led.className = `led ${engineHealthy ? 'led-green' : 'led-red'}`;
  led.title = engineHealthy ? 'Engine RUNNING — Impl + DB + Gate GO + Products ≥70' : 'Engine STOPPED — Check systems';
}

els.notifyBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) { alert('Notifications not supported.'); return; }
  const perm = await Notification.requestPermission();
  alert(perm === 'granted' ? 'Alerts enabled.' : 'Alerts not enabled.');
});

els.refreshBtn.addEventListener('click', render);
els.priorityFilter.addEventListener('change', render);
els.ownerFilter.addEventListener('change', render);

setInterval(render, 5 * 60 * 1000);
render().catch(err => { console.error(err); });
