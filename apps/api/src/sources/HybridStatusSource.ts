import {
  ConsensusCollector,
  type CollectedStatus,
  type StatusCollectorLike,
} from '@monitor-sefaz/core';
import { fromEnvironment, type EnvironmentValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { Environment } from '@monitor-sefaz/catalog';
import { serviceId } from '../store/mappers.js';
import type { StatusSource } from './StatusSource.js';

/**
 * Fonte de status padrão da API: o consenso multi-fonte com precedência oficial
 * (`ConsensusCollector` — SVRS e página da Receita decidem o estado, o
 * IntegraNotas preenche as lacunas), o MESMO motor usado pelo collector (GitHub
 * Actions) e pelo Cloudflare Worker, para que as três pontas produzam os mesmos
 * números para a mesma frota.
 *
 * Mantém o nome `hybrid` por compatibilidade com a config `STATUS_SOURCE`.
 * A fonte é de PRODUÇÃO; homologação retorna vazio.
 */
export class HybridStatusSource implements StatusSource {
  public readonly name = 'hybrid';

  constructor(
    private readonly collector: StatusCollectorLike = ConsensusCollector.createForNode(),
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
