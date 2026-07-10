import { Catalog, Environment, DEFAULT_MIN_COVERAGE_RATIO } from '@monitor-sefaz/catalog';
import {
  AvailabilityCollector,
  type CollectedStatus,
} from '../availability/AvailabilityCollector.js';
import { HttpAvailabilityProvider } from '../availability/AvailabilityProvider.js';
import { IntegraNotasCollector } from '../integranotas/IntegraNotasCollector.js';
import { createHttpIntegraNotasFetcher } from '../integranotas/httpFetcher.js';
import { SvrsCollector } from '../svrs/SvrsCollector.js';
import { SvrsProvider } from '../svrs/SvrsProvider.js';
import { createHttpSvrsFetcher } from '../svrs/httpFetcher.js';
import type { StatusCollectorLike } from '../integranotas/HybridCollector.js';

/** Uma fonte do consenso e se ela é OFICIAL (tem precedência de estado). */
export interface ConsensusSource {
  readonly collector: StatusCollectorLike;
  /** Oficial (SVRS/Receita) vence o estado; não-oficial só preenche lacunas. */
  readonly official: boolean;
  /** Rótulo para logs/diagnóstico. */
  readonly name: string;
}

/**
 * Saúde de uma fonte numa coleta — quanto do catálogo ela cobriu e se está
 * `degraded` (indício de drift do portal). `expected` é o total do catálogo, não
 * a cobertura teórica exata da fonte: o sinal que importa é uma fonte que costuma
 * trazer a maior parte dos serviços despencar para quase nada (parser parou de
 * casar após mudança de HTML), não medir sua fração ideal ao decimal.
 */
export interface SourceHealth {
  readonly source: string;
  readonly official: boolean;
  readonly collected: number;
  readonly expected: number;
  readonly coverage: number;
  readonly degraded: boolean;
}

/** Resultado do consenso com o diagnóstico por fonte anexado. */
export interface ConsensusResult {
  readonly services: CollectedStatus[];
  readonly sources: SourceHealth[];
}

/**
 * Coletor MULTI-FONTE com PRECEDÊNCIA OFICIAL.
 *
 * Substitui o `HybridCollector` (que era failover A→B) por um cruzamento real:
 * coleta todas as fontes em paralelo e, por serviço (`document:uf`), aplica:
 *
 * 1. A primeira fonte OFICIAL (na ordem dada) que reporta o serviço define o
 *    `state`/`cStat`/`source` — é a verdade-fonte.
 * 2. Fontes não-oficiais só PREENCHEM serviços que nenhuma oficial cobre (o
 *    IntegraNotas, mais completo, completa as UFs que o SVRS/Receita não listam).
 * 3. A `latencyMs` da fonte vencedora é mantida; se ela for 0 (o SVRS não publica
 *    latência de rede), HERDA a latência de outra fonte que mediu o mesmo serviço,
 *    para não regredir a métrica de latência exibida.
 *
 * Uma fonte que lança/zera não derruba as demais (`allSettled`).
 */
export class ConsensusCollector implements StatusCollectorLike {
  public readonly name = 'consensus';

  constructor(
    private readonly sources: ConsensusSource[],
    private readonly catalog = new Catalog(),
    /** Piso de cobertura por fonte abaixo do qual ela é marcada `degraded`. */
    private readonly minCoverageRatio = DEFAULT_MIN_COVERAGE_RATIO
  ) {}

  /**
   * Consenso padrão para Node, em ordem de precedência:
   * SVRS (oficial) → página oficial da Receita (oficial) → IntegraNotas (terceiro,
   * mais completo). Mesmo motor para api, collector (Actions) e — quando portado —
   * o Worker.
   */
  public static createForNode(
    catalog = new Catalog(),
    minCoverageRatio = DEFAULT_MIN_COVERAGE_RATIO
  ): ConsensusCollector {
    return new ConsensusCollector(
      [
        {
          name: 'svrs',
          official: true,
          collector: new SvrsCollector(new SvrsProvider(createHttpSvrsFetcher()), catalog),
        },
        {
          name: 'availability',
          official: true,
          collector: new AvailabilityCollector(new HttpAvailabilityProvider(), catalog),
        },
        {
          name: 'integranotas',
          official: false,
          collector: IntegraNotasCollector.create(createHttpIntegraNotasFetcher(), catalog),
        },
      ],
      catalog,
      minCoverageRatio
    );
  }

  public async collect(): Promise<CollectedStatus[]> {
    const { services } = await this.collectWithDiagnostics();
    return services;
  }

  /**
   * Como `collect()`, mas também devolve a saúde por fonte (cobertura + `degraded`)
   * — o sinal de drift do portal. A API/worker/collector usam `collect()`; quem
   * quer o diagnóstico (o `summary.json`) chama este método.
   */
  public async collectWithDiagnostics(): Promise<ConsensusResult> {
    const settled = await Promise.allSettled(this.sources.map((s) => s.collector.collect()));
    const results = settled.map((r, i) => ({
      source: this.sources[i]!,
      statuses: r.status === 'fulfilled' ? r.value : [],
    }));

    const expected = this.catalog.listAll(Environment.Production).length;
    const floor = Math.floor(expected * this.minCoverageRatio);
    const sourceHealth: SourceHealth[] = results.map(({ source, statuses }) => ({
      source: source.name,
      official: source.official,
      collected: statuses.length,
      expected,
      coverage: expected === 0 ? 0 : Number((statuses.length / expected).toFixed(3)),
      degraded: statuses.length < floor,
    }));

    const key = (s: CollectedStatus): string => `${s.document}:${s.uf}`;
    const winners = new Map<string, CollectedStatus>();
    // Latência REAL medida por qualquer fonte (para herança quando a vencedora é 0).
    const measuredLatency = new Map<string, number>();

    // Primeiro passe: registra a melhor latência real conhecida de cada serviço.
    for (const { statuses } of results) {
      for (const s of statuses) {
        if (s.latencyMs > 0 && !measuredLatency.has(key(s))) {
          measuredLatency.set(key(s), s.latencyMs);
        }
      }
    }

    // Precedência: oficiais primeiro (na ordem dada), depois não-oficiais. Dentro
    // de cada grupo, a primeira fonte a reportar um serviço vence; as seguintes
    // não sobrescrevem.
    const ordered = [
      ...results.filter((r) => r.source.official),
      ...results.filter((r) => !r.source.official),
    ];
    for (const { statuses } of ordered) {
      for (const s of statuses) {
        const k = key(s);
        if (winners.has(k)) {
          continue; // já decidido por uma fonte de maior precedência
        }
        const latencyMs = s.latencyMs > 0 ? s.latencyMs : (measuredLatency.get(k) ?? 0);
        winners.set(k, latencyMs === s.latencyMs ? s : { ...s, latencyMs });
      }
    }

    return { services: [...winners.values()], sources: sourceHealth };
  }
}
