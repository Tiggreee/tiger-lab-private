const TASKS_URL = './tasks.json';

const els = {
  metrics: document.getElementById('metrics'),
  humanTasks: document.getElementById('humanTasks'),
  aiTasks: document.getElementById('aiTasks'),
  allTasks: document.getElementById('allTasks'),
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

async function loadTasks() {
  const response = await fetch(TASKS_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load tasks');
  return response.json();
}

async function render() {
  const data = await loadTasks();
  renderMetrics(data.tasks);
  renderLists(data.tasks);
  triggerNotification(data.tasks);
  const now = new Date().toLocaleString();
  els.footerText.textContent = `Last refresh: ${now} | Timezone: ${data.meta.timezone}`;
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
