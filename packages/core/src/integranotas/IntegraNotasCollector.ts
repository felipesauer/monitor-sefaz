import { Catalog, Environment, type DocumentType } from '@monitor-sefaz/catalog';
import { CSTAT_DOWN, CSTAT_OPERATIONAL, CSTAT_SLOWDOWN } from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';
import type { CollectedStatus } from '../availability/AvailabilityCollector.js';
import { IntegraNotasProvider, type IntegraNotasFetcher } from './IntegraNotasProvider.js';

function stateToCStat(state: ServiceState): number | null {
  switch (state) {
    case ServiceState.Operational:
    case ServiceState.Contingency:
      return CSTAT_OPERATIONAL; // 107 — operando (inclusive via contingência)
    case ServiceState.SlowDown:
      return CSTAT_SLOWDOWN; // 108
    case ServiceState.Down:
      return CSTAT_DOWN; // 109
    default:
      return null;
  }
}

/**
 * Coleta o status dos 5 documentos POR UF a partir da API JSON do IntegraNotas.
 *
 * Vantagem sobre o scraping da página oficial: medição real por estado (não
 * derivada de autorizador) e cobertura nativa de MDF-e/DC-e. O autorizador de
 * cada UF ainda vem do `Catalog` (só para exibição). A latência de rede não é
 * fornecida pela fonte — usamos o "tempo médio" (s→ms) quando disponível.
 */
export class IntegraNotasCollector {
  public readonly name = 'integranotas';

  constructor(
    private readonly provider: IntegraNotasProvider,
    private readonly catalog = new Catalog()
  ) {}

  public static create(
    fetcher: IntegraNotasFetcher,
    catalog = new Catalog()
  ): IntegraNotasCollector {
    return new IntegraNotasCollector(new IntegraNotasProvider(fetcher), catalog);
  }

  public async collect(): Promise<CollectedStatus[]> {
    const out: CollectedStatus[] = [];

    for (const document of this.provider.supportedDocuments()) {
      let rows;
      try {
        rows = await this.provider.fetch(document);
      } catch {
        continue; // documento que falha não derruba os demais
      }
      for (const row of rows) {
        const entry = this.catalog.resolve(document, row.uf, Environment.Production);
        out.push({
          document,
          uf: row.uf,
          authorizer: entry?.authorizer ?? row.uf,
          state: row.state,
          cStat: stateToCStat(row.state),
          // tMed é em segundos; convertemos para ms (0 quando ausente).
          latencyMs: row.tMedSeconds != null ? row.tMedSeconds * 1000 : 0,
        });
      }
    }

    return out;
  }

  /** Quantos documentos retornaram ao menos uma linha (para o fallback decidir). */
  public async collectWithCount(): Promise<{ statuses: CollectedStatus[]; documents: number }> {
    const statuses = await this.collect();
    const docs = new Set(statuses.map((s) => s.document as DocumentType));
    return { statuses, documents: docs.size };
  }
}
