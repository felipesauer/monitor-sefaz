import type { AuthorizerRegistry, BatchChecker } from '@monitor-sefaz/core';
import { toEnvironment, type EnvironmentValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { toServiceStatusDTO } from '../store/mappers.js';
import type { StatusSource } from './StatusSource.js';

/**
 * Fonte baseada em consulta SOAP direta aos webservices de status da SEFAZ.
 * Dados ricos (cStat, latência, tMed reais), mas exige saída de rede e, em
 * vários autorizadores, certificado A1 (mTLS).
 */
export class SoapStatusSource implements StatusSource {
  public readonly name = 'soap';

  constructor(
    private readonly batch: BatchChecker,
    private readonly registry: AuthorizerRegistry
  ) {}

  public async collect(env: EnvironmentValue): Promise<ServiceStatusDTO[]> {
    const targets = this.registry.listAll(toEnvironment(env));
    const results = await this.batch.checkAll(targets);
    return results.map(toServiceStatusDTO);
  }
}
