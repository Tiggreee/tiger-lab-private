import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const markdownMode = args.includes('--markdown');
const input = path.resolve('ops/command-center/tasks.json');

const raw = fs.readFileSync(input, 'utf8');
const data = JSON.parse(raw);

function daysUntil(dateISO) {
  const now = new Date();
  const due = new Date(`${dateISO}T23:59:59`);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const active = data.tasks.filter((t) => t.status !== 'done');
const overdue = active.filter((t) => daysUntil(t.dueDate) < 0);
const hot = active.filter((t) => t.owner === 'human' && daysUntil(t.dueDate) <= 1);

function lineFor(task) {
  const delta = daysUntil(task.dueDate);
  const due = delta < 0 ? `OVERDUE ${Math.abs(delta)}d` : delta === 0 ? 'DUE TODAY' : `DUE ${delta}d`;
  return `- [${task.priority}] [${task.owner}] ${task.title} | ${due} | ${task.nextAction}`;
}

if (markdownMode) {
  let out = '';
  out += '# Daily Monetization Reminder\n\n';
  out += `- Active tasks: ${active.length}\n`;
  out += `- Overdue tasks: ${overdue.length}\n`;
  out += `- Human urgent tasks (<=1 day): ${hot.length}\n\n`;

  out += '## You must do these now\n';
  if (hot.length === 0) {
    out += '- No urgent human task detected for today.\n';
  } else {
    hot.forEach((task) => {
      out += `${lineFor(task)}\n`;
    });
  }

  out += '\n## AI-side tasks\n';
  const ai = active.filter((t) => t.owner === 'ai');
  if (ai.length === 0) {
    out += '- No pending AI task.\n';
  } else {
    ai.forEach((task) => {
      out += `${lineFor(task)}\n`;
    });
  }

  out += '\n## Blockers I cannot solve alone\n';
  out += '- Client calls and negotiation require your direct action.\n';
  out += '- Outbound messages require your account presence and follow-up.\n';
  out += '- Contract signature and payment collection require your approval flow.\n';

  process.stdout.write(out);
} else {
  console.log('Daily Monetization Summary');
  console.log('==========================');
  console.log(`Active: ${active.length}`);
  console.log(`Overdue: ${overdue.length}`);
  console.log(`Human urgent: ${hot.length}`);
  console.log('');
  console.log('You must do now:');
  hot.forEach((t) => console.log(lineFor(t)));
}
