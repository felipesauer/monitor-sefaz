import type { AuthorizerCode, DocumentType, Environment, UF } from '@monitor-sefaz/catalog';

/**
 * Estado normalizado de um serviço, derivado do `cStat` ou de falha de transporte.
 */
export enum ServiceState {
  /** Serviço em operação (cStat 107). */
  Operational = 'OPERATIONAL',
  /** Paralisação momentânea / degradação (cStat 108). */
  SlowDown = 'SLOWDOWN',
  /** Paralisação sem previsão (cStat 109). */
  Down = 'DOWN',
  /** Falha de transporte/parsing (timeout, HTML, XML inválido, SOAP Fault). */
  Error = 'ERROR',
}

/** Alvo de uma única consulta de status: tudo que o checker precisa. */
export interface ServiceTarget {
  readonly document: DocumentType;
  readonly uf: UF;
  readonly authorizer: AuthorizerCode;
  readonly environment: Environment;
  /** Código IBGE usado no envelope SOAP. */
  readonly cUF: number;
  readonly url: string;
}

/** Resultado de uma consulta de status para um `ServiceTarget`. */
export interface StatusResult {
  readonly target: ServiceTarget;
  readonly state: ServiceState;
  readonly cStat: number | null;
  readonly xMotivo: string | null;
  readonly latencyMs: number;
  readonly dhRecbto: string | null;
  readonly tMed: number | null;
  readonly httpStatus: number | null;
  readonly error: string | null;
  readonly checkedAt: Date;
}
