import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SvrsParser } from '@monitor-sefaz/core';
import {
  formatSummary,
  summarize,
  toPageSample,
  type FetchOutcome,
  type PageSample,
} from './availabilitySample.js';

/**
 * Amostrador das páginas de disponibilidade do SVRS (estudo, não produção).
 *
 * Lê cada página a cada SAMPLE_INTERVAL_S segundos durante SAMPLE_DURATION_MIN
 * minutos e grava uma linha JSON por leitura em `samples.jsonl`. No fim, grava o
 * resumo por página (`summary.json` e `summary.md`) e o repete no resumo do job
 * do Actions. Não commita nada e não usa segredo: roda no workflow manual
 * `study-sampling.yml`, que sobe a pasta como artefato.
 *
 * Usa o `fetch` nativo, e não o fetcher do core, porque o estudo precisa do
 * status HTTP e do tempo de cada leitura, que o fetcher não expõe. As páginas do
 * SVRS respondem 200 direto, sem o ciclo de cookie das páginas da Receita.
 */

const PAGES = (process.env.SAMPLE_PAGES ?? 'Nf3e,Nfcom,Mdfe,Bpe,Cte')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const DURATION_MS = Number(process.env.SAMPLE_DURATION_MIN ?? 345) * 60_000;
const INTERVAL_MS = Number(process.env.SAMPLE_INTERVAL_S ?? 300) * 1000;
const TIMEOUT_MS = 30_000;
const OUT_DIR = resolve(process.env.SAMPLE_OUT ?? 'sampling');

const pageUrl = (page: string): string =>
  `https://dfe-portal.svrs.rs.gov.br/${page}/Disponibilidade`;

async function fetchPage(url: string): Promise<{ outcome: FetchOutcome; html: string }> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'monitor-sefaz-estudo (+https://github.com/felipesauer/monitor-sefaz)',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = Buffer.from(await res.arrayBuffer());
    return {
      outcome: {
        httpStatus: res.status,
        latencyMs: Date.now() - started,
        bytes: body.length,
        error: null,
      },
      html: body.toString('latin1'),
    };
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause?.code;
    return {
      outcome: {
        httpStatus: null,
        latencyMs: Date.now() - started,
        bytes: 0,
        error: cause ?? (err instanceof Error ? err.message.slice(0, 120) : 'erro'),
      },
      html: '',
    };
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const jsonl = join(OUT_DIR, 'samples.jsonl');
  writeFileSync(jsonl, '');
  const parser = new SvrsParser();
  const samples: PageSample[] = [];

  const deadline = Date.now() + DURATION_MS;
  let round = 0;
  console.log(
    `Amostrando ${PAGES.join(', ')} a cada ${INTERVAL_MS / 1000}s por ${DURATION_MS / 60_000} min.`
  );
  while (Date.now() < deadline) {
    const roundStart = Date.now();
    round += 1;
    for (const page of PAGES) {
      const { outcome, html } = await fetchPage(pageUrl(page));
      let authorizers: ReturnType<SvrsParser['parse']> = [];
      if (outcome.httpStatus === 200) {
        try {
          authorizers = parser.parse(html);
        } catch {
          authorizers = [];
        }
      }
      const sample = toPageSample(page, new Date(roundStart).toISOString(), outcome, authorizers);
      samples.push(sample);
      appendFileSync(jsonl, `${JSON.stringify(sample)}\n`);
    }
    console.log(`Rodada ${round} concluída.`);
    const wait = roundStart + INTERVAL_MS - Date.now();
    if (Date.now() + Math.max(wait, 0) >= deadline) break;
    if (wait > 0) await sleep(wait);
  }

  const summaries = summarize(samples);
  const markdown = formatSummary(summaries);
  writeFileSync(join(OUT_DIR, 'summary.json'), `${JSON.stringify(summaries, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, 'summary.md'), `${markdown}\n`);
  console.log(`\n${markdown}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## Amostragem das páginas de disponibilidade\n\n${round} rodadas.\n\n${markdown}\n`
    );
  }
}

void main();
