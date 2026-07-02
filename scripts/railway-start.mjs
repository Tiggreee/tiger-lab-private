import { spawn } from 'node:child_process';

const command = 'npm run start';

console.log(`[railway-start] command="${command}"`);

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
