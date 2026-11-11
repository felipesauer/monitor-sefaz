import { describe, it, expect } from 'vitest';
import { detailSnapshotSchema } from '../src/detail.js';

const valid = {
  generatedAt: '2026-11-11T01:30:00.000Z',
  authorizers: [
    {
      document: 'NFe',
      authorizer: 'SVRS',
      environment: 'production',
      source: 'svrs',
      ufs: ['AC', 'AL'],
      operations: [
        { operation: 'WS Status', state: 'OPERATIONAL', cStat: 107, sourceCheckedAt: '01:29:58' },
        { operation: 'Status Serviço4', state: 'DOWN', cStat: null },
      ],
    },
  ],
};

describe('detailSnapshotSchema', () => {
  it('aceita o details.json que a coleta grava', () => {
    expect(detailSnapshotSchema.parse(valid).authorizers[0]!.operations).toHaveLength(2);
  });

  it('recusa ambiente, fonte ou estado fora do contrato', () => {
    const bad = (patch: Record<string, unknown>) =>
      detailSnapshotSchema.safeParse({
        ...valid,
        authorizers: [{ ...valid.authorizers[0], ...patch }],
      }).success;
    expect(bad({ environment: 'staging' })).toBe(false);
    expect(bad({ source: 'monitorsefaz' })).toBe(false);
    expect(bad({ operations: [{ operation: 'x', state: 'UP', cStat: null }] })).toBe(false);
  });
});
