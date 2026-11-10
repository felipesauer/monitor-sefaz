import {
  appendObservations,
  compactHistorySchema,
  emptyCompactHistory,
  pruneCompactHistory,
  type CompactHistoryDTO,
  type HistoryObservation,
} from './compact-history.js';

/** Chave única do histórico compacto no KV. */
export const COMPACT_HISTORY_KEY = 'history:v1';

/**
 * Cadência nominal da coleta (5 min). É a grade usada ao expandir os segmentos
 * de volta para pontos; precisa casar com o cron que dispara a coleta.
 */
export const COMPACT_HISTORY_STEP_MS = 5 * 60 * 1000;

/** Janela retida. 72h é o maior período que o dashboard oferece. */
export const COMPACT_HISTORY_RETENTION_MS = 72 * 60 * 60 * 1000;

/**
 * O mínimo de um armazenamento chave → texto. O Worker o implementa sobre o
 * binding do KV; o collector, sobre a API REST do Cloudflare. O store não sabe
 * qual dos dois está do outro lado.
 */
export interface TextStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * Persistência do histórico compacto.
 *
 * Deliberadamente UMA chave só. O free tier do KV permite 1.000 escritas/dia:
 * com uma chave por serviço seriam ~160 escritas por rodada (dezenas de milhares
 * por dia), enquanto um único blob consolidado custa 288 escritas/dia na
 * cadência de 5 minutos, folgado dentro da cota. O formato compacto é o que
 * torna esse blob único viável.
 */
export class CompactHistoryStore {
  constructor(
    private readonly store: TextStore,
    /** Avisado quando o blob gravado é ilegível e a janela recomeça. */
    private readonly onInvalid: (reason: string) => void = () => {}
  ) {}

  /** Lê o histórico. Ausente ou corrompido → começa do zero, sem lançar. */
  public async read(nowMs: number): Promise<CompactHistoryDTO> {
    const empty = (): CompactHistoryDTO =>
      emptyCompactHistory(new Date(nowMs).toISOString(), COMPACT_HISTORY_STEP_MS);
    const raw = await this.store.get(COMPACT_HISTORY_KEY);
    if (raw === null) {
      return empty();
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      this.onInvalid('o texto gravado não é JSON');
      return empty();
    }
    const parsed = compactHistorySchema.safeParse(json);
    if (!parsed.success) {
      // Um blob inválido (formato antigo, escrita truncada) não pode travar a
      // coleta para sempre: recomeçamos a janela em vez de propagar o erro.
      this.onInvalid(parsed.error.issues.map((i) => i.message).join('; '));
      return empty();
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
      COMPACT_HISTORY_RETENTION_MS
    );
    await this.store.put(COMPACT_HISTORY_KEY, JSON.stringify(next));
    return next;
  }
}
