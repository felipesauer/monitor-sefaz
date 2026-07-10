import { describe, it, expect } from 'vitest';
import {
  DocumentType,
  type ServiceStatusDTO,
  type ServiceStateValue,
} from '@monitor-sefaz/contracts';
import { detectTransitions } from '../src/diff.js';

const AT = '2026-07-10T00:00:00.000Z';

/** Serviço mínimo para o diff (id estável document:uf). */
function svc(uf: string, state: ServiceStateValue): ServiceStatusDTO {
  return {
    id: `NFe:${uf}`,
    document: DocumentType.NFe,
    uf,
    authorizer: uf,
    environment: 'production',
    state,
    cStat: null,
    xMotivo: null,
    latencyMs: 0,
    source: 'svrs',
    error: null,
    checkedAt: AT,
  };
}

const types = (prev: ServiceStatusDTO[], next: ServiceStatusDTO[]): string[] =>
  detectTransitions(prev, next, AT).map((e) => e.type);

describe('detectTransitions', () => {
  it('baseline: serviço sem estado anterior não gera evento', () => {
    expect(types([], [svc('SP', 'OPERATIONAL')])).toEqual([]);
    expect(types([], [svc('SP', 'DOWN')])).toEqual([]); // nem quando começa DOWN
  });

  it('sem mudança de estado não gera evento', () => {
    expect(types([svc('SP', 'OPERATIONAL')], [svc('SP', 'OPERATIONAL')])).toEqual([]);
  });

  it('OPERATIONAL → DOWN gera SERVICE_DOWN', () => {
    expect(types([svc('SP', 'OPERATIONAL')], [svc('SP', 'DOWN')])).toEqual(['SERVICE_DOWN']);
  });

  it('DOWN → OPERATIONAL gera SERVICE_RECOVERED', () => {
    expect(types([svc('SP', 'DOWN')], [svc('SP', 'OPERATIONAL')])).toEqual(['SERVICE_RECOVERED']);
  });

  it('ERROR conta como fora do ar: OPERATIONAL → ERROR gera SERVICE_DOWN', () => {
    expect(types([svc('SP', 'OPERATIONAL')], [svc('SP', 'ERROR')])).toEqual(['SERVICE_DOWN']);
  });

  it('OPERATIONAL → CONTINGENCY: só CONTINGENCY_ENTERED (contingência é "no ar")', () => {
    // isUp(CONTINGENCY)===true, então NÃO há SERVICE_DOWN aqui.
    expect(types([svc('SP', 'OPERATIONAL')], [svc('SP', 'CONTINGENCY')])).toEqual([
      'CONTINGENCY_ENTERED',
    ]);
  });

  it('CONTINGENCY → OPERATIONAL: só CONTINGENCY_EXITED (segue no ar)', () => {
    expect(types([svc('SP', 'CONTINGENCY')], [svc('SP', 'OPERATIONAL')])).toEqual([
      'CONTINGENCY_EXITED',
    ]);
  });

  it('DOWN → CONTINGENCY gera DOIS eventos ortogonais (RECOVERED + ENTERED)', () => {
    // Voltou a operar (via SVC) E entrou em contingência — sinais independentes.
    expect(types([svc('SP', 'DOWN')], [svc('SP', 'CONTINGENCY')])).toEqual([
      'SERVICE_RECOVERED',
      'CONTINGENCY_ENTERED',
    ]);
  });

  it('CONTINGENCY → DOWN gera SERVICE_DOWN + CONTINGENCY_EXITED', () => {
    expect(types([svc('SP', 'CONTINGENCY')], [svc('SP', 'DOWN')])).toEqual([
      'SERVICE_DOWN',
      'CONTINGENCY_EXITED',
    ]);
  });

  it('preenche os campos do evento a partir do serviço atual', () => {
    const prev = [svc('SP', 'OPERATIONAL')];
    const next = [{ ...svc('SP', 'DOWN'), cStat: 109 }];
    const [ev] = detectTransitions(prev, next, AT);
    expect(ev).toMatchObject({
      type: 'SERVICE_DOWN',
      serviceId: 'NFe:SP',
      uf: 'SP',
      document: DocumentType.NFe,
      previousState: 'OPERATIONAL',
      currentState: 'DOWN',
      cStat: 109,
      occurredAt: AT,
    });
  });

  it('processa vários serviços e ignora os que não mudaram', () => {
    const prev = [svc('SP', 'OPERATIONAL'), svc('RJ', 'OPERATIONAL'), svc('MG', 'DOWN')];
    const next = [svc('SP', 'DOWN'), svc('RJ', 'OPERATIONAL'), svc('MG', 'OPERATIONAL')];
    const events = detectTransitions(prev, next, AT);
    expect(events.map((e) => `${e.serviceId}:${e.type}`)).toEqual([
      'NFe:SP:SERVICE_DOWN',
      'NFe:MG:SERVICE_RECOVERED',
    ]);
  });
});
