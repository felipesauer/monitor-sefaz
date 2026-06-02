import type { DataSource } from './DataSource.js';
import { ApiDataSource } from './ApiDataSource.js';
import { StaticDataSource } from './StaticDataSource.js';

/**
 * Seleciona a fonte de dados em build/runtime:
 * - Se `VITE_API_BASE_URL` estiver definida → consome a API/Worker ao vivo.
 * - Caso contrário → lê os JSONs estáticos versionados (modo GitHub Pages),
 *   relativos ao `BASE_URL` da aplicação.
 */
export function createDataSource(): DataSource {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) {
    return new ApiDataSource(apiBase.replace(/\/$/, ''));
  }
  return new StaticDataSource(import.meta.env.BASE_URL ?? '/');
}

export const dataSource = createDataSource();
export type { DataSource, StatusFilters } from './DataSource.js';
