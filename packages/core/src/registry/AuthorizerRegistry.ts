import { Catalog, type DocumentType, type Environment, type UF } from '@monitor-sefaz/catalog';
import type { ServiceTarget } from '../domain/types.js';

/** Resolve combinações documento+UF+ambiente em `ServiceTarget`s concretos. */
export interface AuthorizerRegistry {
  /** Resolve um alvo único, ou `null` se não houver endpoint cadastrado. */
  resolve(document: DocumentType, uf: UF, environment: Environment): ServiceTarget | null;
  /** Lista todos os alvos com endpoint cadastrado para um ambiente. */
  listAll(environment: Environment): ServiceTarget[];
}

/**
 * Implementação baseada em `@monitor-sefaz/catalog`. Toda a regra de
 * "qual UF delega a qual autorizador" vive no catálogo (data-only); aqui apenas
 * convertemos `CatalogEntry` em `ServiceTarget`.
 */
export class CatalogAuthorizerRegistry implements AuthorizerRegistry {
  constructor(private readonly catalog: Catalog = new Catalog()) {}

  public resolve(
    document: DocumentType,
    uf: UF,
    environment: Environment
  ): ServiceTarget | null {
    const entry = this.catalog.resolve(document, uf, environment);
    if (!entry) {
      return null;
    }
    return {
      document: entry.document,
      uf: entry.uf,
      authorizer: entry.authorizer,
      environment: entry.environment,
      cUF: entry.cUF,
      url: entry.url,
    };
  }

  public listAll(environment: Environment): ServiceTarget[] {
    return this.catalog.listAll(environment).map((entry) => ({
      document: entry.document,
      uf: entry.uf,
      authorizer: entry.authorizer,
      environment: entry.environment,
      cUF: entry.cUF,
      url: entry.url,
    }));
  }
}
