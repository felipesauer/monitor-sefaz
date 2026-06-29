import { describe, it, expect } from 'vitest';
import { resilientStatusSnapshotSchema, statusSnapshotSchema } from '../src/schemas.js';

function service(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'NFe:SP',
    document: 'NFe',
    uf: 'SP',
    authorizer: 'SVRS',
    environment: 'production',
    state: 'OPERATIONAL',
    cStat: 107,
    xMotivo: null,
    latencyMs: 0,
    error: null,
    checkedAt: '2026-06-29T12:00:00Z',
    ...over,
  };
}

describe('resilientStatusSnapshotSchema', () => {
  it('descarta o service inválido e mantém os válidos', () => {
    const snapshot = {
      environment: 'production',
      generatedAt: '2026-06-29T12:00:00Z',
      services: [
        service({ id: 'NFe:SP' }),
        service({ id: 'NFe:RJ', state: 'MAINTENANCE' }), // estado desconhecido
        service({ id: 'NFe:MG' }),
      ],
    };
    // o schema estrito derrubaria o snapshot inteiro
    expect(() => statusSnapshotSchema.parse(snapshot)).toThrow();
    // o resiliente mantém os 2 válidos
    const parsed = resilientStatusSnapshotSchema.parse(snapshot);
    expect(parsed.services.map((s) => s.id)).toEqual(['NFe:SP', 'NFe:MG']);
  });

  it('mantém todos quando todos são válidos', () => {
    const snapshot = {
      environment: 'production',
      generatedAt: '2026-06-29T12:00:00Z',
      services: [service({ id: 'NFe:SP' }), service({ id: 'NFe:RJ' })],
    };
    expect(resilientStatusSnapshotSchema.parse(snapshot).services).toHaveLength(2);
  });

  it('falha quando a estrutura externa é inválida (services não é array)', () => {
    const bad = { environment: 'production', generatedAt: 'x', services: 'nope' };
    expect(resilientStatusSnapshotSchema.safeParse(bad).success).toBe(false);
  });
});
