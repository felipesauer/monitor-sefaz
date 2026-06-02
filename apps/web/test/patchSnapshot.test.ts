import { describe, it, expect } from 'vitest';
import type { ServiceStatusDTO, StatusSnapshotDTO } from '@monitor-sefaz/contracts';
import { patchSnapshot } from '../src/hooks/useStatusStream.js';

function service(id: string, state: ServiceStatusDTO['state']): ServiceStatusDTO {
  const [document, uf] = id.split(':');
  return {
    id,
    document: document as ServiceStatusDTO['document'],
    uf: uf!,
    authorizer: uf!,
    environment: 'producao',
    state,
    cStat: state === 'OPERATIONAL' ? 107 : 109,
    xMotivo: null,
    latencyMs: 10,
    error: null,
    checkedAt: '2026-06-02T12:00:00.000Z',
  };
}

const snapshot: StatusSnapshotDTO = {
  environment: 'producao',
  generatedAt: '2026-06-02T11:00:00.000Z',
  services: [service('NFe:SP', 'OPERATIONAL'), service('NFe:RS', 'OPERATIONAL')],
};

describe('patchSnapshot', () => {
  it('atualiza apenas os serviços que mudaram, preservando os demais', () => {
    const result = patchSnapshot(snapshot, [service('NFe:RS', 'DOWN')]);
    expect(result?.services).toHaveLength(2);
    expect(result?.services.find((s) => s.id === 'NFe:RS')?.state).toBe('DOWN');
    expect(result?.services.find((s) => s.id === 'NFe:SP')?.state).toBe('OPERATIONAL');
  });

  it('adiciona serviços novos que ainda não estavam no snapshot', () => {
    const result = patchSnapshot(snapshot, [service('NFe:MG', 'SLOWDOWN')]);
    expect(result?.services).toHaveLength(3);
  });

  it('retorna undefined quando não há snapshot em cache', () => {
    expect(patchSnapshot(undefined, [service('NFe:SP', 'DOWN')])).toBeUndefined();
  });
});
