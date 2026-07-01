import { spawn } from 'node:child_process';

const mode = (process.env.RAILWAY_START_MODE || 'backend').toLowerCase();
const command = mode === 'dashboard' ? 'npm run command-center:start' : 'npm run start';

console.log(`[railway-start] mode=${mode} command="${command}"`);

const child = spawn(command, {
  shell: true,
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[railway-start] exited by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
