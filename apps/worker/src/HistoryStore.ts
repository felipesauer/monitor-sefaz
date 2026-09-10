import {
  appendObservations,
  compactHistorySchema,
  emptyCompactHistory,
  pruneCompactHistory,
  type CompactHistoryDTO,
  type HistoryObservation,
} from '@monitor-sefaz/contracts';

/** Chave única do histórico no KV. */
const KEY = 'history:v1';

/**
 * Cadência nominal da coleta agendada (5 min). É a grade usada ao expandir os
 * segmentos de volta para pontos — precisa casar com o cron do wrangler.toml.
 */
export const STEP_MS = 5 * 60 * 1000;

/** Janela retida. 72h é o maior período que o dashboard oferece. */
export const RETENTION_MS = 72 * 60 * 60 * 1000;

/**
 * Persistência do histórico no Workers KV.
 *
 * Deliberadamente UMA chave só. O free tier do KV permite 1.000 escritas/dia:
 * com uma chave por serviço seriam 135 escritas por rodada (~39 mil/dia, muito
 * além do limite), enquanto um único blob consolidado custa 288 escritas/dia
 * na cadência de 5 minutos — folgado dentro da cota. O formato compacto
 * (`@monitor-sefaz/contracts`) é o que torna esse blob único viável.
 */
export class HistoryStore {
  constructor(private readonly kv: KVNamespace) {}

  /** Lê o histórico. Ausente ou corrompido → começa do zero, sem lançar. */
  public async read(nowMs: number): Promise<CompactHistoryDTO> {
    const raw = await this.kv.get(KEY, 'json');
    if (raw === null) {
      return emptyCompactHistory(new Date(nowMs).toISOString(), STEP_MS);
    }
    const parsed = compactHistorySchema.safeParse(raw);
    if (!parsed.success) {
      // Um blob inválido (formato antigo, escrita truncada) não pode travar a
      // coleta para sempre: recomeçamos a janela em vez de propagar o erro.
      console.warn('Histórico em KV inválido; recomeçando a janela.', parsed.error.issues);
      return emptyCompactHistory(new Date(nowMs).toISOString(), STEP_MS);
    }
    return parsed.data;
  }

  /** Incorpora uma rodada, poda a janela e grava. Devolve o resultado. */
  public async append(
    observations: readonly HistoryObservation[],
    nowMs: number
  ): Promise<CompactHistoryDTO> {
    const current = await this.read(nowMs);
    const next = pruneCompactHistory(
      appendObservations(current, observations, nowMs),
      RETENTION_MS
    );
    await this.kv.put(KEY, JSON.stringify(next));
    return next;
  }
}
