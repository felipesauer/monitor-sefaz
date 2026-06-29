import {
  AvailabilityCollector,
  HttpAvailabilityProvider,
  type CollectedStatus,
} from '@monitor-sefaz/core';
import { fromEnvironment, type EnvironmentValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { Environment } from '@monitor-sefaz/catalog';
import { serviceId } from '../store/mappers.js';
import type { StatusSource } from './StatusSource.js';

/**
 * Fonte de status baseada no scraping da página oficial de disponibilidade.
 * Delega a coleta ao `AvailabilityCollector` do core (mesmo motor usado pelo
 * Cloudflare Worker e pelo GitHub Actions) e adapta o resultado para o DTO.
 *
 * A página oficial é de PRODUÇÃO; homologação retorna vazio.
 */
export class AvailabilityStatusSource implements StatusSource {
  public readonly name = 'availability';

  constructor(
    private readonly collector = new AvailabilityCollector(new HttpAvailabilityProvider()),
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
      sourceCheckedAt: s.sourceCheckedAt,
      error: null,
      checkedAt,
    };
  }
}
