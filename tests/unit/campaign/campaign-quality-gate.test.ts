import { describe, expect, it } from 'vitest';
import { evaluateDraftQuality } from '../../../scripts/traffic/campaign-quality-gate.mjs';

describe('campaign quality gate', () => {
  it('rejects generic copy with weak specificity', () => {
    const result = evaluateDraftQuality({
      campaignId: 'CAMP-1',
      copies: {
        linkedin: 'Tu embudo no esta roto. Escribe ACTIVAR para el flujo de 4 pasos.'
      },
      brand: {
        productName: 'Docflow API',
        problemDetail: 'documentos manuales',
        primaryOutcome: 'automatizacion CFDI',
        proofPoint: '80% menos tiempo',
        domainTerms: ['cfdi', 'timbrado', 'xml']
      },
      threshold: 60
    });

    expect(result.passed).toBe(false);
    expect(result.failedChannels).toContain('linkedin');
    expect(result.channels[0].genericPatterns.length).toBeGreaterThan(0);
  });

  it('passes specific copy with brand language', () => {
    const result = evaluateDraftQuality({
      campaignId: 'CAMP-2',
      copies: {
        linkedin:
          'Docflow API reduce retrabajo CFDI con timbrado y validacion XML automatica. Caso real: 80% menos tiempo operativo en un dia de integracion.'
      },
      brand: {
        productName: 'Docflow API',
        problemDetail: 'flujos documentales manuales',
        primaryOutcome: 'automatizacion completa CFDI',
        proofPoint: '80% menos tiempo operativo',
        domainTerms: ['cfdi', 'timbrado', 'xml', 'integracion']
      },
      threshold: 45
    });

    expect(result.passed).toBe(true);
    expect(result.failedChannels).toHaveLength(0);
    expect(result.channels[0].specificityScore).toBeGreaterThanOrEqual(45);
  });
});
