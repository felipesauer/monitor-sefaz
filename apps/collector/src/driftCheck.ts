import type { SourceHealth } from '@monitor-sefaz/core';

/**
 * Fontes com indisponibilidade ESTRUTURAL conhecida no ambiente de coleta — não
 * são drift, então não devem gerar alerta nem falhar o guard. Hoje: `availability`
 * (página da Receita), que RECUSA conexões dos IPs do GitHub Actions (timeout de
 * conexão), enquanto SVRS e IntegraNotas respondem normalmente. Nos caminhos
 * Worker/API self-host (IPs alcançáveis) a fonte segue ativa; ela só é ignorada
 * aqui para o sinal de drift não ser ruído diário que mascararia um drift real.
 * Se a Receita voltar a aceitar o Actions, a coleta a reincorpora sozinha; basta
 * remover daqui para o alerta voltar.
 */
export const KNOWN_UNREACHABLE_SOURCES: ReadonlySet<string> = new Set(['availability']);

/** Resultado da avaliação de drift a partir da saúde por fonte. */
export interface DriftReport {
  /** Há drift? (ao menos uma fonte OFICIAL degradada e NÃO isenta.) */
  readonly drift: boolean;
  /** Nomes das fontes oficiais degradadas que contam como drift. */
  readonly degradedOfficial: string[];
  /** Linhas legíveis por fonte, para o log do CI. */
  readonly lines: string[];
}

/**
 * Avalia o diagnóstico por fonte de uma coleta AO VIVO e decide se há drift.
 * Função PURA. Drift = alguma fonte OFICIAL veio degradada (cobertura abaixo do
 * piso) E não está na allowlist de indisponibilidade estrutural conhecida — o
 * sinal de que o portal mudou o HTML e o parser parou de casar. Fontes
 * não-oficiais não contam (o consenso não depende delas para o estado).
 */
export function evaluateDrift(
  sources: readonly SourceHealth[],
  ignore: ReadonlySet<string> = KNOWN_UNREACHABLE_SOURCES
): DriftReport {
  const degradedOfficial = sources
    .filter((s) => s.official && s.degraded && !ignore.has(s.source))
    .map((s) => s.source);

  const lines = sources.map((s) => {
    const ignored = s.degraded && ignore.has(s.source) ? ' (inalcançável — ignorada)' : '';
    return (
      `  ${s.official ? '[oficial]' : '[terceiro]'} ${s.source}: ` +
      `${s.collected}/${s.expected} (${Math.round(s.coverage * 100)}%)` +
      `${s.degraded ? ' — DEGRADADA' : ''}${ignored}`
    );
  });

  return { drift: degradedOfficial.length > 0, degradedOfficial, lines };
}
