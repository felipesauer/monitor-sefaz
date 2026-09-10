import https from 'node:https';
import { URL } from 'node:url';
import { Catalog, DocumentType, Environment, type CatalogEntry } from '@monitor-sefaz/catalog';

/**
 * Sanidade dos endpoints SOAP do catálogo.
 *
 * O `@monitor-sefaz/catalog` é publicado no npm, e a lista de endpoints é o
 * dado dele com maior chance de envelhecer em silêncio: a SEFAZ move um
 * webservice de caminho e nada avisa — já aconteceu com o SP, que passou a
 * responder 404 num endpoint que continuava no catálogo. Como o monitor opera
 * por padrão no modo sem certificado, nenhuma rotina normal exercita esses
 * endereços, e o erro só apareceria para quem usasse o pacote no modo SOAP.
 *
 * Este check é DELIBERADAMENTE raso: só pergunta se existe algo servindo
 * naquele endereço. Não valida o serviço em si (isso exigiria certificado A1),
 * então:
 *
 * - 200, 401, 403, 405, 500 → endereço VÁLIDO. O host respondeu; recusar o
 *   nosso GET sem certificado ou sem envelope SOAP é o comportamento esperado.
 * - 404, 410 → SUSPEITO. O caminho provavelmente mudou.
 * - DNS não resolve → SUSPEITO. O host saiu do ar de vez.
 * - Timeout / conexão recusada → INCONCLUSIVO. Instabilidade momentânea não é
 *   drift; reportamos à parte para não gerar alarme falso.
 *
 * Só os SUSPEITOS falham o processo.
 *
 * Usamos `node:https` com `rejectUnauthorized: false`, e não o `fetch` nativo,
 * pela mesma razão que o `AxiosSoapClient`: vários autorizadores servem cadeias
 * ICP-Brasil incompletas, e o trust store padrão as rejeita antes de qualquer
 * resposta. Sem isso, TODOS os endpoints falhariam com
 * `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` e o check não diria nada sobre o caminho
 * — que é justamente o que ele existe para verificar.
 */

const TIMEOUT_MS = Number(process.env.ENDPOINT_CHECK_TIMEOUT_MS ?? 15_000);
const CONCURRENCY = Number(process.env.ENDPOINT_CHECK_CONCURRENCY ?? 6);

/** Um endereço serve para os dois ambientes; testamos cada URL uma vez só. */
function uniqueEndpoints(catalog: Catalog): Map<string, CatalogEntry[]> {
  const byUrl = new Map<string, CatalogEntry[]>();
  for (const environment of [Environment.Production, Environment.Homologation]) {
    for (const document of Object.values(DocumentType)) {
      for (const entry of catalog.list(document, environment)) {
        byUrl.set(entry.url, [...(byUrl.get(entry.url) ?? []), entry]);
      }
    }
  }
  return byUrl;
}

type Verdict = 'ok' | 'suspect' | 'inconclusive';

interface Probe {
  readonly url: string;
  readonly verdict: Verdict;
  readonly detail: string;
  readonly users: string;
}

/** Resposta do host, seja qual for o status, prova que o endereço existe. */
function verdictForStatus(status: number): Verdict {
  return status === 404 || status === 410 ? 'suspect' : 'ok';
}

/** Faz um GET cru e devolve só o status, ignorando a validação de cadeia. */
function requestStatus(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        method: 'GET',
        rejectUnauthorized: false,
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent':
            'monitor-sefaz/endpoint-check (+https://github.com/felipesauer/monitor-sefaz)',
        },
      },
      (res) => {
        // Só interessa a linha de status; drenamos para liberar o socket.
        res.resume();
        resolve(res.statusCode ?? 0);
      }
    );
    req.on('timeout', () => req.destroy(new Error(`timeout após ${TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end();
  });
}

async function probe(url: string, entries: CatalogEntry[]): Promise<Probe> {
  // Quem usa este endereço — para o relatório apontar o que corrigir.
  const users = [...new Set(entries.map((e) => `${e.document}/${e.authorizer}`))].join(', ');
  try {
    const status = await requestStatus(url);
    return { url, verdict: verdictForStatus(status), detail: `HTTP ${status}`, users };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    const detail = err instanceof Error ? err.message : String(err);
    // Um host que não resolve mais em DNS não é instabilidade: sumiu.
    const verdict: Verdict = code === 'ENOTFOUND' ? 'suspect' : 'inconclusive';
    return { url, verdict, detail: code ? `${code}: ${detail}` : detail, users };
  }
}

/** Executa em lotes para não abrir 60 conexões simultâneas com a SEFAZ. */
async function probeAll(byUrl: Map<string, CatalogEntry[]>): Promise<Probe[]> {
  const items = [...byUrl.entries()];
  const results: Probe[] = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map(([url, entries]) => probe(url, entries)))));
  }
  return results;
}

async function main(): Promise<void> {
  const byUrl = uniqueEndpoints(new Catalog());
  console.log(`Verificando ${byUrl.size} endpoints únicos do catálogo…\n`);

  const results = await probeAll(byUrl);
  const suspect = results.filter((r) => r.verdict === 'suspect');
  const inconclusive = results.filter((r) => r.verdict === 'inconclusive');
  const ok = results.length - suspect.length - inconclusive.length;

  for (const r of results.filter((x) => x.verdict !== 'ok')) {
    const mark = r.verdict === 'suspect' ? '❌' : '⚠️ ';
    console.log(`${mark} [${r.users}] ${r.url}\n     ${r.detail}`);
  }

  console.log(
    `\n${ok} respondendo · ${suspect.length} suspeitos · ${inconclusive.length} inconclusivos`
  );

  if (suspect.length > 0) {
    console.error(
      `\n❌ ${suspect.length} endpoint(s) com caminho ou host inválido (404/410/DNS).` +
        ` Confirme no portal do autorizador e atualize packages/catalog/src/endpoints.ts.`
    );
    process.exit(1);
  }
  if (inconclusive.length > 0) {
    // Rede instável não é drift: não falha o processo.
    console.log('\n⚠️  Alguns endpoints não responderam (rede/TLS). Sem conclusão sobre eles.');
  }
  console.log('\n✅ Nenhum endpoint com caminho inválido.');
}

void main();
