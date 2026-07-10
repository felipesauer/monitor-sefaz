import type { NotificationEventDTO } from '@monitor-sefaz/contracts';

/** Transporte HTTP injetável (fetch nativo em prod; fake nos testes). */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number }>;

/** Um destino de notificação. `send` resolve em sucesso e REJEITA em falha. */
export interface Channel {
  readonly name: string;
  send(event: NotificationEventDTO): Promise<void>;
}

/** Opções comuns de entrega. */
export interface DeliveryOptions {
  readonly fetchImpl?: FetchLike;
  /** Timeout por tentativa (ms). */
  readonly timeoutMs?: number;
  /** Sleeper injetável do retry (não dorme nos testes). */
  readonly sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** `fetch` default embrulhado no formato mínimo do `FetchLike`. */
const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status };
};

/**
 * POST JSON com timeout e UMA retentativa. Robustez que falta a scrapers ingênuos:
 * uma falha transitória de rede não perde a notificação, mas também não trava (o
 * timeout aborta) nem repete infinitamente. Lança se ambas as tentativas falharem
 * — quem orquestra (Notifier) isola cada canal com allSettled.
 */
export async function postJson(
  url: string,
  payload: unknown,
  opts: DeliveryOptions = {}
): Promise<void> {
  const doFetch = opts.fetchImpl ?? defaultFetch;
  const sleep = opts.sleep ?? defaultSleep;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json' };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await withTimeout(
        doFetch(url, { method: 'POST', headers, body }),
        timeoutMs
      );
      if (res.ok) {
        return;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt === 1) {
      await sleep(500); // backoff curto antes da única retentativa
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Rejeita se a promessa não resolver dentro de `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout após ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    );
  });
}
