import { ServiceState, type StatusResult } from '../domain/types.js';

/**
 * "No ar" inclui operação normal e contingência (a SEFAZ responde em ambos).
 * Espelha o `isUp` de @monitor-sefaz/contracts — duplicado aqui de propósito
 * para não acoplar o core ao pacote de contratos. Mantenha os dois em sincronia.
 */
function isUp(state: ServiceState): boolean {
  return state === ServiceState.Operational || state === ServiceState.Contingency;
}

/** Resumo agregado de uma rodada de consultas. */
export interface StatusSummary {
  readonly total: number;
  readonly operational: number;
  readonly failing: number;
  /** Percentual de serviços no ar (operacional ou contingência) — 0–100, 1 casa. */
  readonly availability: number;
  /** Latência média (ms) considerando serviços no ar; inclui medições de 0ms. */
  readonly avgLatencyMs: number | null;
}

/** Calcula resumos agregados a partir de uma lista de resultados (porte de report.js). */
export class StatusReport {
  public summarize(results: readonly StatusResult[]): StatusSummary {
    const total = results.length;
    const operational = results.filter((r) => isUp(r.state)).length;
    const failing = total - operational;
    const availability = total === 0 ? 0 : Number(((operational / total) * 100).toFixed(1));

    // Espelha averageLatency de @monitor-sefaz/contracts: inclui 0 (medição
    // legítima) e ignora negativos (ausência). Duplicado para não acoplar o core.
    const latencies = results
      .filter((r) => isUp(r.state))
      .map((r) => r.latencyMs)
      .filter((ms) => ms >= 0);
    const avgLatencyMs =
      latencies.length === 0
        ? null
        : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

    return { total, operational, failing, availability, avgLatencyMs };
  }
}
