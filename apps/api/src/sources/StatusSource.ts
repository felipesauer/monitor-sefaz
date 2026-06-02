import type { EnvironmentValue, ServiceStatusDTO } from '@monitor-sefaz/contracts';

/**
 * Fonte de status: produz o snapshot de serviços de um ambiente.
 *
 * Abstrai DE ONDE vêm os dados — consulta SOAP direta (rica, exige rede/cert) ou
 * scraping da página oficial de disponibilidade (pública, sem certificado). O
 * scheduler depende desta interface (DIP), não da implementação concreta.
 */
export interface StatusSource {
  readonly name: string;
  collect(env: EnvironmentValue): Promise<ServiceStatusDTO[]>;
}
