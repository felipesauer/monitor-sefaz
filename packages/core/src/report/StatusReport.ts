import { ServiceState, type StatusResult } from '../domain/types.js';

/** Resumo agregado de uma rodada de consultas. */
export interface StatusSummary {
  readonly total: number;
  readonly operational: number;
  readonly failing: number;
  /** Percentual de serviços operacionais (0–100, uma casa decimal). */
  readonly availability: number;
  /** Latência média (ms) considerando apenas serviços operacionais. */
  readonly avgLatencyMs: number | null;
}

/** Calcula resumos agregados a partir de uma lista de resultados (porte de report.js). */
export class StatusReport {
  public summarize(results: readonly StatusResult[]): StatusSummary {
    const total = results.length;
    const operational = results.filter((r) => r.state === ServiceState.Operational).length;
    const failing = total - operational;
    const availability = total === 0 ? 0 : Number(((operational / total) * 100).toFixed(1));

    const latencies = results
      .filter((r) => r.state === ServiceState.Operational && r.latencyMs > 0)
      .map((r) => r.latencyMs);
    const avgLatencyMs =
      latencies.length === 0
        ? null
        : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

    return { total, operational, failing, availability, avgLatencyMs };
  }
}
