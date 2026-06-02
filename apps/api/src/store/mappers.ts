import { type StatusResult } from '@monitor-sefaz/core';
import { fromEnvironment, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { type DocumentType, type UF } from '@monitor-sefaz/catalog';

/** Identificador estável de um serviço dentro de um ambiente. */
export function serviceId(document: DocumentType, uf: UF): string {
  return `${document}:${uf}`;
}

/** Converte um `StatusResult` do core no DTO público da API. */
export function toServiceStatusDTO(result: StatusResult): ServiceStatusDTO {
  return {
    id: serviceId(result.target.document, result.target.uf),
    document: result.target.document,
    uf: result.target.uf,
    authorizer: result.target.authorizer,
    environment: fromEnvironment(result.target.environment),
    state: result.state,
    cStat: result.cStat,
    xMotivo: result.xMotivo,
    latencyMs: result.latencyMs,
    error: result.error,
    checkedAt: result.checkedAt.toISOString(),
  };
}
