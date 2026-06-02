import { describe, it, expect } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import { StatusReport } from '../../src/report/StatusReport.js';
import { ServiceState, type ServiceTarget, type StatusResult } from '../../src/domain/types.js';

const target: ServiceTarget = {
  document: DocumentType.NFe,
  uf: 'SP',
  authorizer: 'SP',
  environment: Environment.Production,
  cUF: 35,
  url: 'https://example.test',
};

function result(state: ServiceState, latencyMs: number): StatusResult {
  return {
    target,
    state,
    cStat: state === ServiceState.Operational ? 107 : 109,
    xMotivo: null,
    latencyMs,
    dhRecbto: null,
    tMed: null,
    httpStatus: 200,
    error: null,
    checkedAt: new Date(0),
  };
}

describe('StatusReport', () => {
  const report = new StatusReport();

  it('calcula disponibilidade e latência média dos operacionais', () => {
    const summary = report.summarize([
      result(ServiceState.Operational, 100),
      result(ServiceState.Operational, 200),
      result(ServiceState.Down, 50),
      result(ServiceState.Error, 0),
    ]);

    expect(summary.total).toBe(4);
    expect(summary.operational).toBe(2);
    expect(summary.failing).toBe(2);
    expect(summary.availability).toBe(50);
    expect(summary.avgLatencyMs).toBe(150);
  });

  it('retorna disponibilidade 0 e latência nula para lista vazia', () => {
    const summary = report.summarize([]);
    expect(summary.availability).toBe(0);
    expect(summary.avgLatencyMs).toBeNull();
  });
});
