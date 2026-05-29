import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCreateProduct } from '../../../scripts/adapters/run-create-product';
import { runGenerateContent } from '../../../scripts/adapters/run-generate-content';

describe('CLI adapters integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes create-product adapter directly', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitCode = await runCreateProduct(['FacturAutentico', 'saas']);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it('executes generate-content adapter directly', async () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitCode = await runGenerateContent(['facturautentico-cloud', 'post', 'web']);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });
});
