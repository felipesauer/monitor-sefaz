import type { ServiceStateValue } from './schemas.js';

/**
 * Fonte ÚNICA da definição de "no ar". Um serviço está disponível quando opera
 * normalmente OU via contingência (SVC) — em ambos a SEFAZ responde (cStat 107).
 *
 * Aceita string genérica porque o enum `ServiceState` do core tem os MESMOS
 * valores textuais (`Operational = 'OPERATIONAL'`, etc.), então collector,
 * worker, API, core e front compartilham este predicado sem conversão.
 *
 * Antes existiam 4 cópias literais e 3 divergências (algumas contavam só
 * OPERATIONAL), fazendo a MESMA frota render availability/uptime diferentes
 * conforme o app. Manter um só lugar elimina essa divergência.
 */
export function isUp(state: ServiceStateValue | string): boolean {
  return state === 'OPERATIONAL' || state === 'CONTINGENCY';
}

/**
 * Latência média (ms) das medições, arredondada; `null` se não houver nenhuma.
 *
 * IMPORTANTE: NÃO descarta `latencyMs === 0`. É latência de rede real em ms e 0
 * é uma medição LEGÍTIMA (resposta sub-ms), não "sem dado". Filtrar `> 0` — como
 * o código já fez — descartava medições válidas e enviesava a média. Só valores
 * negativos (sentinela de ausência, hoje inexistente) são ignorados.
 */
export function averageLatency(latenciesMs: readonly number[]): number | null {
  const valid = latenciesMs.filter((ms) => ms >= 0);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
