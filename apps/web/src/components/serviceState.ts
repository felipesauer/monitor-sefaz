import type { ServiceStateValue } from '@monitor-sefaz/contracts';

/** Metadados visuais (cor e rótulo) de cada estado de serviço. */
export const STATE_META: Record<ServiceStateValue, { label: string; color: string }> = {
  OPERATIONAL: { label: 'Operacional', color: '#16a34a' },
  SLOWDOWN: { label: 'Instável', color: '#d97706' },
  DOWN: { label: 'Indisponível', color: '#dc2626' },
  ERROR: { label: 'Erro', color: '#6b7280' },
};
