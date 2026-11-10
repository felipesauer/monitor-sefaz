import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CompactHistoryStore, statusSnapshotSchema } from '@monitor-sefaz/contracts';
import { kvRestStore, toObservations } from './kvHistory.js';

/**
 * Acrescenta a rodada do `status.json` recém-coletado ao histórico compacto no
 * KV do Worker. Roda no `collect.yml` logo depois da coleta.
 *
 * Sem as três variáveis (num fork, por exemplo), não faz nada e sai com 0: o
 * histórico do KV é um extra, a coleta e o Pages não dependem dele.
 */
async function main(): Promise<void> {
  const dataDir = resolve(process.argv[2] ?? 'public/data');
  const token = process.env.CLOUDFLARE_KV_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.KV_NAMESPACE_ID;
  if (!token || !accountId || !namespaceId) {
    console.log(
      'KV: sem CLOUDFLARE_KV_TOKEN, CLOUDFLARE_ACCOUNT_ID ou KV_NAMESPACE_ID; nada a gravar.'
    );
    return;
  }

  const snapshot = statusSnapshotSchema.parse(
    JSON.parse(readFileSync(join(dataDir, 'status.json'), 'utf8'))
  );
  const store = new CompactHistoryStore(kvRestStore({ accountId, namespaceId, token }), (reason) =>
    console.warn(`KV: histórico gravado inválido (${reason}); recomeçando a janela.`)
  );
  const history = await store.append(toObservations(snapshot), Date.parse(snapshot.generatedAt));
  console.log(
    `KV: rodada de ${snapshot.generatedAt} gravada; ${Object.keys(history.segments).length} séries.`
  );
}

main().catch((err: unknown) => {
  console.error(`KV: falhou (${err instanceof Error ? err.message : String(err)})`);
  process.exit(1);
});
