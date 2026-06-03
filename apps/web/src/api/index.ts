import type { DataSource } from './DataSource.js';
import { ApiDataSource } from './ApiDataSource.js';
import { StaticDataSource } from './StaticDataSource.js';
import { HybridDataSource } from './HybridDataSource.js';

/**
 * Seleciona a fonte de dados em build/runtime:
 * - Com `VITE_API_BASE_URL` → status/summary AO VIVO do Worker/API, mas o
 *   histórico vem do JSON estático (o Worker é stateless, sem acúmulo).
 * - Sem ela → tudo dos JSONs estáticos versionados (modo GitHub Pages).
 */
export function createDataSource(): DataSource {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  const base = import.meta.env.BASE_URL ?? '/';
  const staticSource = new StaticDataSource(base);
  if (apiBase) {
    return new HybridDataSource(new ApiDataSource(apiBase.replace(/\/$/, '')), staticSource);
  }
  return staticSource;
}

export const dataSource = createDataSource();
export type { DataSource, StatusFilters } from './DataSource.js';
