import { bootstrapServerApplication } from './bootstrap/app-bootstrap.js';

const port = Number(process.env.PORT || '8787');
const host = process.env.HOST || '0.0.0.0';

const { server } = bootstrapServerApplication();

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
for (const signal of shutdownSignals) {
  process.on(signal, () => {
    console.log(`Received ${signal}. Closing server gracefully...`);
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
