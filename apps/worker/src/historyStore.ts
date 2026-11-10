import { CompactHistoryStore, type TextStore } from '@monitor-sefaz/contracts';

/** O binding do KV visto como o armazenamento chave → texto do store. */
export function kvTextStore(kv: KVNamespace): TextStore {
  return {
    get: (key) => kv.get(key, 'text'),
    put: (key, value) => kv.put(key, value),
  };
}

/**
 * O histórico compacto sobre o KV do Worker. O Worker só o LÊ (rotas
 * `/history`); quem grava é a coleta do GitHub Actions, pela API REST.
 */
export function historyStore(kv: KVNamespace): CompactHistoryStore {
  return new CompactHistoryStore(kvTextStore(kv), (reason) =>
    console.warn(`Histórico em KV inválido (${reason}); recomeçando a janela.`)
  );
}
