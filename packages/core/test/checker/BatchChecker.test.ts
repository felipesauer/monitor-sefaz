import { describe, it, expect } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import { BatchChecker } from '../../src/checker/BatchChecker.js';
import type { StatusChecker } from '../../src/checker/StatusChecker.js';
import { ServiceState, type ServiceTarget, type StatusResult } from '../../src/domain/types.js';

function makeTarget(uf: string): ServiceTarget {
  return {
    document: DocumentType.NFe,
    uf: uf as ServiceTarget['uf'],
    authorizer: uf as ServiceTarget['authorizer'],
    environment: Environment.Production,
    cUF: 0,
    url: `https://example.test/${uf}`,
  };
}

describe('BatchChecker', () => {
  it('consulta todos os alvos e respeita o limite de concorrência', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const checker = {
      check: async (target: ServiceTarget): Promise<StatusResult> => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        return {
          target,
          state: ServiceState.Operational,
          cStat: 107,
          xMotivo: 'ok',
          latencyMs: 1,
          dhRecbto: null,
          tMed: null,
          httpStatus: 200,
          error: null,
          checkedAt: new Date(0),
        };
      },
    } as unknown as StatusChecker;

    const targets = ['SP', 'MG', 'RS', 'PR', 'BA', 'GO', 'CE'].map(makeTarget);
    const batch = new BatchChecker(checker, 3);
    const results = await batch.checkAll(targets);

    expect(results).toHaveLength(7);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});
