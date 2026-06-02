import {
  DocumentType,
  Environment,
  type AuthorizerCode,
  type EnvironmentKey,
  type UF,
} from './types.js';
import { UF_INFO, ALL_UFS } from './uf-info.js';
import { ENDPOINTS } from './endpoints.js';
import { UF_AUTHORIZERS, DEFAULT_AUTHORIZER, VIRTUAL_AUTHORIZER_CUF } from './authorizers.js';

/** Entrada resolvida do catálogo para uma combinação documento+UF+ambiente. */
export interface CatalogEntry {
  readonly document: DocumentType;
  readonly uf: UF;
  readonly authorizer: AuthorizerCode;
  readonly environment: Environment;
  /** Código IBGE enviado no envelope (da UF física ou do autorizador virtual). */
  readonly cUF: number;
  readonly url: string;
}

function environmentKey(environment: Environment): EnvironmentKey {
  return environment === Environment.Production ? 'producao' : 'homologacao';
}

/**
 * Fonte de verdade dos dados estáticos da SEFAZ.
 *
 * Encapsula endpoints, metadados de UF e a resolução de autorizadores, expondo
 * uma API estável que o motor de consulta (`@monitor-sefaz/core`) consome sem
 * conhecer o formato interno dos dados.
 */
export class Catalog {
  /** Resolve o autorizador responsável por uma UF em um dado documento. */
  public resolveAuthorizer(document: DocumentType, uf: UF): AuthorizerCode {
    return UF_AUTHORIZERS[document][uf] ?? DEFAULT_AUTHORIZER;
  }

  /**
   * Resolve a entrada completa (autorizador + URL + cUF) para
   * documento+UF+ambiente. Retorna `null` quando não há endpoint cadastrado.
   */
  public resolve(document: DocumentType, uf: UF, environment: Environment): CatalogEntry | null {
    const authorizer = this.resolveAuthorizer(document, uf);
    const url = ENDPOINTS[document][environmentKey(environment)][authorizer];
    if (!url) {
      return null;
    }

    return {
      document,
      uf,
      authorizer,
      environment,
      cUF: UF_INFO[uf].cUF,
      url,
    };
  }

  /**
   * Lista todas as entradas com endpoint cadastrado para um documento e
   * ambiente — usado pelo scheduler para varrer todos os serviços.
   */
  public list(document: DocumentType, environment: Environment): CatalogEntry[] {
    const entries: CatalogEntry[] = [];
    for (const uf of ALL_UFS) {
      const entry = this.resolve(document, uf, environment);
      if (entry) {
        entries.push(entry);
      }
    }
    return entries;
  }

  /** Lista todas as entradas de todos os documentos para um ambiente. */
  public listAll(environment: Environment): CatalogEntry[] {
    return Object.values(DocumentType).flatMap((document) => this.list(document, environment));
  }

  /** Código IBGE de um autorizador virtual (SVRS/SVAN/AN/...), se houver. */
  public virtualCUF(authorizer: AuthorizerCode): number | undefined {
    return VIRTUAL_AUTHORIZER_CUF[authorizer];
  }
}
