const TASKS_URL = './tasks.json';
const DECISIONS_URL = './decisions.json';
const PRIORITIZATION_URL = './runtime/dashboard-prioritization-report.json';
const LEADS_URL = './leads/pipeline.json';
const LANDINGS_URL = './landings/index.json';
const AGENT_MONITOR_URL = './runtime/agent-monitor.json';

const els = {
  metrics: document.getElementById('metrics'),
  humanTasks: document.getElementById('humanTasks'),
  aiTasks: document.getElementById('aiTasks'),
  allTasks: document.getElementById('allTasks'),
  decisionsList: document.getElementById('decisionsList'),
  decisionsCount: document.getElementById('decisionsCount'),
  agentFocus: document.getElementById('agentFocus'),
  agentStatus: document.getElementById('agentStatus'),
  leadList: document.getElementById('leadList'),
  leadCount: document.getElementById('leadCount'),
  notifyBtn: document.getElementById('notifyBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  priorityFilter: document.getElementById('priorityFilter'),
  ownerFilter: document.getElementById('ownerFilter'),
  footerText: document.getElementById('footerText')
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

function createTaskRegistry() {
  const registry = document.getElementById('taskRegistry');
  if (!registry) return;

  (async () => {
    const data = await loadJSON(TASKS_URL);
    if (!data || !data.tasks) {
      registry.innerHTML = '<li class="task">No tasks data available</li>';
      return;
    }
    let html = `<li class="task on-track">
      <p><b>Total tasks:</b> ${data.tasks.length} | <b>Done:</b> ${data.tasks.filter(t => t.status === 'done').length} | <b>Pending:</b> ${data.tasks.filter(t => t.status !== 'done').length}</p>
      <p><small>All tasks — including completed — shown below for full audit trail.</small></p>
    </li>`;
    data.tasks.forEach((task, i) => {
      const sc = statusClass(task);
      const ownerLabel = task.owner === 'human' ? 'You' : 'AI';
      const debtLabel = task.debtSettled ? '✅ Settled' : '❌ Pending';
      html += `<li class="task ${sc}">
        <h3>#${i + 1}. ${task.id} — ${task.title}</h3>
        <p>
          <span class="badge">${task.priority}</span>
          <span class="badge">${ownerLabel}</span>
          <span class="badge">${task.area}</span>
          <span class="badge">${task.status}</span>
          <span class="badge">${debtLabel}</span>
        </p>
        <p><b>Due:</b> ${task.dueDate} (${urgencyText(task)})</p>
        <p><b>Action:</b> ${task.nextAction}</p>
        ${task.evidence ? `<p><small>Evidence: ${task.evidence}</small></p>` : ''}
        ${task.blocker ? `<p><small>Blocker: ${task.blocker}</small></p>` : ''}
        ${task.debtNote ? `<p><small>Debt note: ${task.debtNote}</small></p>` : ''}
      </li>`;
    });
    registry.innerHTML = html;
  })();
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

function renderMetrics(tasks) {
  const active = tasks.filter((t) => t.status !== 'done');
  const overdue = active.filter((t) => daysUntil(t.dueDate) < 0);
  const dueSoon = active.filter((t) => {
    const d = daysUntil(t.dueDate);
    return d >= 0 && d <= 2;
  });
  const humanPending = active.filter((t) => t.owner === 'human');

  const cards = [
    ['Active Tasks', active.length],
    ['Overdue', overdue.length],
    ['Due in 48h', dueSoon.length],
    ['Your Pending', humanPending.length]
  ];

  els.metrics.innerHTML = '';
  cards.forEach(([label, value]) => {
    const div = document.createElement('div');
    div.className = 'metric';
    div.innerHTML = `<small>${label}</small><b>${value}</b>`;
    els.metrics.appendChild(div);
  });
}

function renderDecisions(decisions) {
  if (!decisions || !decisions.result || !decisions.result.report) {
    els.decisionsList.innerHTML = '<li class="task">No decision data available</li>';
    els.decisionsCount.textContent = '0';
    return;
  }

  const report = decisions.result.report;
  els.decisionsCount.textContent = report.totalProducts;

  let html = `
    <li class="task on-track">
      <h3>Supervisor Report</h3>
      <p>
        <span class="badge">${report.activeProducts} Active</span>
        <span class="badge">${report.flaggedProducts} Flagged</span>
        <span class="badge">${report.retiredProducts} Retired</span>
        <span class="badge">$${report.totalPotentialRevenue}/mo potential</span>
      </p>
      <p><b>Evaluated at:</b> ${new Date(report.evaluatedAt).toLocaleString()}</p>
    </li>
  `;

  if (report.recommendations && report.recommendations.length > 0) {
    report.recommendations.forEach((rec) => {
      html += `<li class="task due-soon"><p>${rec}</p></li>`;
    });
  }

  if (decisions.result.pending) {
    decisions.result.pending.forEach((d) => {
      const impact = d.impact === 'critical' ? 'overdue' : d.impact === 'high' ? 'due-soon' : 'on-track';
      html += `
        <li class="task ${impact}">
          <h3>${d.title}</h3>
          <p><span class="badge">${d.type}</span> <span class="badge">${d.impact}</span> <span class="badge">${Math.round(d.confidence * 100)}% conf</span></p>
          <p>${d.description}</p>
          <p><small>${d.evidence.slice(0, 2).join(' · ')}</small></p>
        </li>
      `;
    });
  }

  els.decisionsList.innerHTML = html;
}

function renderLists(tasks) {
  const active = tasks.filter((t) => t.status !== 'done');

  const human = active.filter((t) => t.owner === 'human');
  const ai = active.filter((t) => t.owner === 'ai');

  els.humanTasks.innerHTML = '';
  human.forEach((t) => els.humanTasks.appendChild(createTaskNode(t)));

  els.aiTasks.innerHTML = '';
  ai.forEach((t) => els.aiTasks.appendChild(createTaskNode(t)));

  const p = els.priorityFilter.value;
  const o = els.ownerFilter.value;

  const filtered = active.filter((t) => (p === 'all' || t.priority === p) && (o === 'all' || t.owner === o));
  els.allTasks.innerHTML = '';
  filtered.forEach((t) => els.allTasks.appendChild(createTaskNode(t)));
}

function triggerNotification(tasks) {
  const hot = tasks.filter((t) => t.status !== 'done' && t.owner === 'human' && daysUntil(t.dueDate) <= 1);
  if (!hot.length) return;

  if ('Notification' in window && Notification.permission === 'granted') {
    const top = hot.slice(0, 2).map((t) => t.title).join(' | ');
    const body = `You have ${hot.length} urgent task(s): ${top}`;
    new Notification('Tiger Command Center Alert', { body });
  }
}

async function loadJSON(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function loadTasks() {
  const response = await fetch(TASKS_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load tasks');
  return response.json();
}

function renderAgentPanel(report) {
  if (!report || !report.recommendedFocus) {
    els.agentFocus.innerHTML = '<li class="task">No prioritization data</li>';
    return;
  }

  let html = `<li class="task on-track">
    <p><b>Revisado:</b> ${new Date(report.prioritizedAt).toLocaleString()}</p>
    <p><b>Activas:</b> ${report.totalActive} | <b>Vencidas:</b> ${report.overdueCount} | <b>Archivadas:</b> ${report.archivedCount}</p>
  </li>`;

  if (report.recommendedFocus.length > 0) {
    html += `<li class="task due-soon"><h3>🎯 Enfoque recomendado</h3>`;
    report.recommendedFocus.forEach((r, i) => {
      html += `<p>${i + 1}. ${r}</p>`;
    });
    html += `</li>`;
  }

  if (report.alerts && report.alerts.length > 0) {
    report.alerts.forEach(a => {
      html += `<li class="task overdue"><p>🚨 ${a.alert}</p></li>`;
    });
  }

  els.agentFocus.innerHTML = html;
}

function renderLandingsPanel(landings) {
  const list = document.getElementById('landingsList');
  if (!list) return;
  if (!landings || !landings.summary) {
    list.innerHTML = '<li class="task">No landing data available</li>';
    return;
  }

  const s = landings.summary;
  let html = `<li class="task on-track">
    <p><b>Total:</b> ${s.totalLandingPages} landings | <b>Productos:</b> ${s.totalProducts} (${s.activeProducts} activos, ${s.pausedProducts} pausados)</p>
    <p><b>Canales:</b> ${s.channelsUsed.join(', ')}</p>
  </li>`;

  for (const [productId, info] of Object.entries(landings.products)) {
    const statusIcon = info.status === 'active' ? '🟢' : '⏸️';
    html += `<li class="task ${info.status === 'active' ? 'on-track' : 'due-soon'}">
      <p>${statusIcon} <b>${info.product}</b> — ${info.status} — Canales: ${info.channels.join(', ')}</p>
    </li>`;
  }

  if (landings.activeProducts && landings.activeProducts.length > 0) {
    html += `<li class="task on-track"><p><b>Productos activos con landing:</b> ${landings.activeProducts.join(', ')}</p></li>`;
  }

  list.innerHTML = html;
}

function renderAgentMonitor(monitor) {
  const list = document.getElementById('agentMonitorList');
  if (!list) return;
  if (!monitor || !monitor.summary) {
    list.innerHTML = '<li class="task">No agent monitor data available</li>';
    return;
  }

  const s = monitor.summary;
  const allActive = s.activeAgents === s.totalAgents;
  const statusEmoji = allActive ? '🟢' : '🟡';
  const statusText = allActive ? 'Todos los agentes activos' : `${s.activeAgents}/${s.totalAgents} activos`;

  let html = `<li class="task ${allActive ? 'on-track' : 'due-soon'}">
    <p>${statusEmoji} <b>${statusText}</b></p>
    <p>
      <span class="badge">💰 ${s.directMonetization} directos</span>
      <span class="badge">⚙️ ${s.indirectMonetization} indirectos</span>
      <span class="badge">🔧 ${s.supportGovernance} soporte</span>
      <span class="badge">${s.monetizationContributing} contribuyen a monetizacion</span>
    </p>
  </li>`;

  for (const agent of monitor.agents) {
    const activeIcon = agent.active ? '🟢' : '🔴';
    const monetIcon = agent.monetizationContribution === 'si' ? '💰' : agent.monetizationContribution === 'parcial' ? '🔧' : '⏸️';
    const typeLabel = agent.type === 'Copilot Agent' ? 'Copilot' : agent.type === 'Release Auditor' ? 'Release' : 'Project';
    html += `<li class="task ${agent.active ? 'on-track' : 'overdue'}">
      <p>${activeIcon} ${monetIcon} <b>${agent.name}</b> <span class="badge">${typeLabel}</span></p>
      <p>${agent.active ? 'Activo' : 'Inactivo'} · Monetizacion: ${agent.monetizationContribution} (${agent.monetizationType})</p>
      <p><small>${agent.contributionDetail}</small></p>
      ${agent.integrationChannels.length > 0 ? `<p><small>Integraciones: ${agent.integrationChannels.join(', ')}</small></p>` : ''}
    </li>`;
  }

  list.innerHTML = html;
}

function renderLeadPanel(pipeline) {
  if (!pipeline || !pipeline.stats) {
    els.leadList.innerHTML = '<li class="task">No lead data</li>';
    els.leadCount.textContent = '0';
    return;
  }

  els.leadCount.textContent = pipeline.stats.total;

  let html = `
    <li class="task on-track">
      <p><b>Pipeline:</b> ${pipeline.stats.total} leads</p>
      <p>
        <span class="badge">${pipeline.stats.new} nuevos</span>
        <span class="badge">${pipeline.stats.contacted} contactados</span>
        <span class="badge">${pipeline.stats.replied} respondedieron</span>
        <span class="badge">${pipeline.stats.converted} convertidos</span>
      </p>
      ${pipeline.lastOutreachGenerated ? `<p><small>Último outreach: ${new Date(pipeline.lastOutreachGenerated).toLocaleString()}</small></p>` : ''}
    </li>`;

  if (pipeline.leads && pipeline.leads.length > 0) {
    const recent = pipeline.leads.slice(-3).reverse();
    recent.forEach(l => {
      html += `<li class="task ${l.status === 'new' ? 'due-soon' : 'on-track'}">
        <p><b>${l.name}</b> — ${l.company} <span class="badge">${l.industry}</span></p>
        <p><small>${l.pain} · ${l.status}</small></p>
      </li>`;
    });
  }

  els.leadList.innerHTML = html;
}

async function loadDecisions() {
  try {
    const response = await fetch(DECISIONS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load decisions');
    return response.json();
  } catch {
    const fallback = await fetch('http://localhost:8787/decisions/report', { cache: 'no-store' }).catch(() => null);
    if (fallback && fallback.ok) return fallback.json();
    return null;
  }
}

async function render() {
  const [tasksData, decisionsData, prioritizationData, leadData, landingsData, agentMonitorData] = await Promise.all([
    loadTasks(),
    loadDecisions(),
    loadJSON(PRIORITIZATION_URL),
    loadJSON(LEADS_URL),
    loadJSON(LANDINGS_URL),
    loadJSON(AGENT_MONITOR_URL)
  ]);
  renderMetrics(tasksData.tasks);
  renderLists(tasksData.tasks);
  createTaskRegistry();
  renderDecisions(decisionsData);
  renderAgentPanel(prioritizationData);
  renderLeadPanel(leadData);
  renderLandingsPanel(landingsData);
  renderAgentMonitor(agentMonitorData);
  triggerNotification(tasksData.tasks);
  const now = new Date().toLocaleString();
  els.footerText.textContent = `Last refresh: ${now} | Timezone: ${tasksData.meta.timezone}`;
}

els.notifyBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    alert('Browser notifications are not supported in this browser.');
    return;
  }
  const perm = await Notification.requestPermission();
  alert(perm === 'granted' ? 'Alerts enabled.' : 'Alerts not enabled.');
});

els.refreshBtn.addEventListener('click', render);
els.priorityFilter.addEventListener('change', render);
els.ownerFilter.addEventListener('change', render);

setInterval(render, 5 * 60 * 1000);
render().catch((err) => {
  console.error(err);
  alert('Could not load tasks.json. Run the local command center server first.');
});
