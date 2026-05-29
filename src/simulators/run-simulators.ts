import { pathToFileURL } from 'node:url';
import { createHardeningRuntime } from '../hardening/HardeningRuntime';

export async function runSimulators(): Promise<Record<string, unknown>> {
  const runtime = createHardeningRuntime();
  await runtime.simulators.traffic.simulate('web', 20);
  await runtime.simulators.funnel.run('facturautentico-cloud', 'web', 5);
  await runtime.simulators.pricing.run('stress_customer', 'pro', 10);

  return runtime.runDiagnostics();
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && import.meta.url === pathToFileURL(entry).href);
}

if (isDirectExecution()) {
  void runSimulators().then((output) => {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  });
}
