import { Catalog } from '@monitor-sefaz/catalog';
import {
  AvailabilityCollector,
  type CollectedStatus,
} from '../availability/AvailabilityCollector.js';
import { HttpAvailabilityProvider } from '../availability/AvailabilityProvider.js';
import { IntegraNotasCollector } from './IntegraNotasCollector.js';
import { createHttpIntegraNotasFetcher } from './httpFetcher.js';

/** Collector que produz `CollectedStatus[]`. */
export interface StatusCollectorLike {
  collect(): Promise<CollectedStatus[]>;
}

/**
 * Fonte HÍBRIDA: tenta o IntegraNotas (JSON, 5 documentos por UF de verdade) e,
 * se ele falhar ou trouxer poucos dados, cai para o scraping da página oficial
 * da SEFAZ. Combina a fidelidade do IntegraNotas com a resiliência da fonte
 * oficial — se um terceiro mudar/cair, o monitor continua de pé.
 */
export class HybridCollector implements StatusCollectorLike {
  public readonly name = 'hybrid';

  constructor(
    private readonly primary: StatusCollectorLike,
    private readonly fallback: StatusCollectorLike,
    /** Mínimo de serviços para considerar a fonte primária bem-sucedida. */
    private readonly minServices = 100
  ) {}

  /** Monta o híbrido padrão para Node (IntegraNotas → scraping oficial). */
  public static createForNode(catalog = new Catalog()): HybridCollector {
    const primary = IntegraNotasCollector.create(createHttpIntegraNotasFetcher(), catalog);
    const fallback = new AvailabilityCollector(new HttpAvailabilityProvider(), catalog);
    return new HybridCollector(primary, fallback);
  }

  public async collect(): Promise<CollectedStatus[]> {
    try {
      const primary = await this.primary.collect();
      if (primary.length >= this.minServices) {
        return primary;
      }
    } catch {
      // cai para o fallback
    }
    return this.fallback.collect();
  }
}
