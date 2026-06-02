import type { ServiceStateValue } from '@monitor-sefaz/contracts';

/** Metadados visuais de cada estado: rótulo (PT-BR) e cor (via token CSS). */
export const STATE_META: Record<ServiceStateValue, { label: string; color: string }> = {
  OPERATIONAL: { label: 'Operacional', color: 'var(--ok)' },
  SLOWDOWN: { label: 'Instável', color: 'var(--slow)' },
  DOWN: { label: 'Indisponível', color: 'var(--down)' },
  ERROR: { label: 'Sem dados', color: 'var(--err)' },
};

/** Ordem de severidade para ordenar/priorizar exibição. */
export const STATE_SEVERITY: Record<ServiceStateValue, number> = {
  DOWN: 3,
  SLOWDOWN: 2,
  ERROR: 1,
  OPERATIONAL: 0,
};
