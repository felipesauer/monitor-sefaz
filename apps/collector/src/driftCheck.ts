import type { SourceHealth } from '@monitor-sefaz/core';

/** Resultado da avaliação de drift a partir da saúde por fonte. */
export interface DriftReport {
  /** Há drift? (ao menos uma fonte OFICIAL degradada.) */
  readonly drift: boolean;
  /** Nomes das fontes oficiais degradadas. */
  readonly degradedOfficial: string[];
  /** Linhas legíveis por fonte, para o log do CI. */
  readonly lines: string[];
}

/**
 * Avalia o diagnóstico por fonte de uma coleta AO VIVO e decide se há drift.
 * Função PURA. Drift = alguma fonte OFICIAL veio degradada (cobertura abaixo do
 * piso) — o sinal de que o portal mudou o HTML e o parser parou de casar, que as
 * fixtures estáticas não pegam. Fontes não-oficiais degradadas não contam
 * (o consenso não depende delas para o estado).
 */
export function evaluateDrift(sources: readonly SourceHealth[]): DriftReport {
  const degradedOfficial = sources
    .filter((s) => s.official && s.degraded)
    .map((s) => s.source);

  const lines = sources.map(
    (s) =>
      `  ${s.official ? '[oficial]' : '[terceiro]'} ${s.source}: ` +
      `${s.collected}/${s.expected} (${Math.round(s.coverage * 100)}%)` +
      `${s.degraded ? ' — DEGRADADA' : ''}`
  );

  return { drift: degradedOfficial.length > 0, degradedOfficial, lines };
}
