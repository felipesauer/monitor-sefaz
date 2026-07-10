/**
 * Utilitários de retry/backoff compartilhados pelas fontes ao vivo (Availability,
 * SVRS e IntegraNotas). Ficam no domínio — e não em uma fonte específica — porque
 * os três providers seguem a MESMA política: algumas tentativas com backoff linear
 * e jitter, já que os portais da SEFAZ e a API do IntegraNotas ocasionalmente
 * recusam a conexão ou devolvem uma resposta vazia de forma transitória.
 */

/** Espera `ms` antes de resolver. Injetável para os testes não dormirem de verdade. */
export type Sleeper = (ms: number) => Promise<void>;

/** Sleeper padrão baseado em `setTimeout`. */
export const defaultSleeper: Sleeper = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Atraso (ms) antes da próxima tentativa: linear (500ms × tentativa) com jitter
 * de ±20%. `attempt` é 1-based; `random` deve devolver [0,1). Função pura para
 * ser testável de forma determinística.
 */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  return Math.round(500 * attempt * (0.8 + random() * 0.4));
}
