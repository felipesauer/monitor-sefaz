import type { HistoryObservation, StatusSnapshotDTO, TextStore } from '@monitor-sefaz/contracts';

/**
 * Gravação do histórico compacto no KV do Worker a partir do GitHub Actions.
 * O Worker deixou de coletar (o plano Free corta a CPU da execução agendada);
 * o Actions coleta e grava a rodada aqui, pela API REST do Cloudflare, na
 * mesma chave que o Worker lê para servir `/history`.
 */

export interface KvRestConfig {
  readonly accountId: string;
  readonly namespaceId: string;
  /** Token do Cloudflare com Workers KV Storage: Edit. */
  readonly token: string;
}

/** O KV do Cloudflare, pela API REST, como armazenamento chave → texto. */
export function kvRestStore(config: KvRestConfig, fetchImpl: typeof fetch = fetch): TextStore {
  const base =
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}` +
    `/storage/kv/namespaces/${config.namespaceId}/values/`;
  const auth = { Authorization: `Bearer ${config.token}` };
  return {
    async get(key) {
      const res = await fetchImpl(base + encodeURIComponent(key), { headers: auth });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`KV GET ${key}: HTTP ${res.status}`);
      return res.text();
    },
    async put(key, value) {
      const res = await fetchImpl(base + encodeURIComponent(key), {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'text/plain; charset=utf-8' },
        body: value,
      });
      if (!res.ok) throw new Error(`KV PUT ${key}: HTTP ${res.status}`);
    },
  };
}

/** Uma rodada do snapshot vira as observações que o histórico compacto acumula. */
export function toObservations(snapshot: StatusSnapshotDTO): HistoryObservation[] {
  return snapshot.services.map((s) => ({
    id: s.id,
    state: s.state,
    cStat: s.cStat,
    latencyMs: s.latencyMs,
  }));
}
