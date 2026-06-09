#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const entry = resolve(__dirname, './dist/server/bootstrap/app-bootstrap.js');

try {
  const { bootstrapServerApplication } = await import(`file://${entry}`);
  const { server } = bootstrapServerApplication();
  server.listen(DEFAULT_PORT, () => {
    console.log(`Production backend server running on http://localhost:${DEFAULT_PORT}`);
  });

  const shutdownSignals = ['SIGINT', 'SIGTERM'];
  for (const signal of shutdownSignals) {
    process.on(signal, () => {
      console.log(`Received ${signal}. Closing production server gracefully...`);
      server.close((error) => {
        if (error) {
          console.error('Error during graceful shutdown:', error.message);
          process.exit(1);
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Graceful shutdown timeout reached. Forcing exit.');
        process.exit(1);
      }, 30_000).unref();
    });
  }
} catch (error) {
  console.error('Failed to start production backend server:', error instanceof Error ? error.message : error);
  process.exit(1);
}
