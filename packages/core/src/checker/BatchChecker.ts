import type { ServiceTarget, StatusResult } from '../domain/types.js';
import type { StatusChecker } from './StatusChecker.js';

/**
 * Consulta múltiplos alvos com limite de concorrência, processando em lotes
 * (generaliza `consultarTodas` do protótipo) para não sobrecarregar a SEFAZ.
 */
export class BatchChecker {
  constructor(
    private readonly checker: StatusChecker,
    private readonly concurrency = 5
  ) {}

  public async checkAll(targets: readonly ServiceTarget[]): Promise<StatusResult[]> {
    const results: StatusResult[] = [];
    for (let i = 0; i < targets.length; i += this.concurrency) {
      const batch = targets.slice(i, i + this.concurrency);
      const batchResults = await Promise.all(batch.map((target) => this.checker.check(target)));
      results.push(...batchResults);
    }
    return results;
  }
}
