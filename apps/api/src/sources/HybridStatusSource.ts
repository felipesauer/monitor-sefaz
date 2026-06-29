import {
  HybridCollector,
  type CollectedStatus,
  type StatusCollectorLike,
} from '@monitor-sefaz/core';
import { fromEnvironment, type EnvironmentValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { Environment } from '@monitor-sefaz/catalog';
import { serviceId } from '../store/mappers.js';
import type { StatusSource } from './StatusSource.js';

/**
 * Fonte de status HÍBRIDA: IntegraNotas (JSON, 5 docs por UF) com fallback ao
 * scraping oficial — o MESMO motor (`HybridCollector`) usado pelo collector
 * (GitHub Actions) e pelo Cloudflare Worker. É o default da API para que as três
 * pontas produzam números e semântica de latência idênticos para a mesma frota.
 *
 * A fonte é de PRODUÇÃO; homologação retorna vazio.
 */
export class HybridStatusSource implements StatusSource {
  public readonly name = 'hybrid';

  constructor(
    private readonly collector: StatusCollectorLike = HybridCollector.createForNode(),
    private readonly now: () => number = () => Date.now()
  ) {}

  public async collect(env: EnvironmentValue): Promise<ServiceStatusDTO[]> {
    if (env !== 'production') {
      return [];
    }
    const checkedAt = new Date(this.now()).toISOString();
    const collected = await this.collector.collect();
    return collected.map((s) => this.toDTO(s, checkedAt));
  }

  private toDTO(s: CollectedStatus, checkedAt: string): ServiceStatusDTO {
    return {
      id: serviceId(s.document, s.uf),
      document: s.document,
      uf: s.uf,
      authorizer: s.authorizer,
      environment: fromEnvironment(Environment.Production),
      state: s.state,
      cStat: s.cStat,
      xMotivo: null,
      latencyMs: s.latencyMs,
      source: s.source,
      error: null,
      checkedAt,
    };
  }
}
