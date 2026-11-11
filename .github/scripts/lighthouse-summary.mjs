// Resume os relatórios JSON do Lighthouse de uma pasta (<página>-<perfil>-<rodada>.json)
// numa tabela Markdown com a mediana de cada página e perfil. Escreve também
// summary.md na mesma pasta. Uso: node lighthouse-summary.mjs <pasta>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const dir = process.argv[2];
if (!dir) throw new Error('uso: node lighthouse-summary.mjs <pasta>');

const median = (values) => {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const groups = new Map();
for (const file of readdirSync(dir).filter((f) => /-(mobile|desktop)-\d+\.json$/.test(f))) {
  const key = file.replace(/-\d+\.json$/, '');
  const report = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const list = groups.get(key) ?? [];
  list.push(report);
  groups.set(key, list);
}

const score = (r, c) => {
  const value = r.categories?.[c]?.score;
  return typeof value === 'number' ? value * 100 : null;
};
const audit = (r, a) => r.audits?.[a]?.numericValue ?? null;
const div = (v, d) => (v === null ? null : v / d);

const rows = [...groups.entries()].sort().map(([key, reports]) => {
  const m = (fn) => median(reports.map(fn));
  const fmt = (v, digits = 0) => (v === null ? '—' : v.toFixed(digits));
  return [
    key,
    reports.length,
    fmt(m((r) => score(r, 'performance'))),
    fmt(m((r) => score(r, 'accessibility'))),
    fmt(m((r) => score(r, 'best-practices'))),
    fmt(m((r) => score(r, 'seo'))),
    fmt(
      div(
        m((r) => audit(r, 'first-contentful-paint')),
        1000
      ),
      2
    ),
    fmt(
      div(
        m((r) => audit(r, 'largest-contentful-paint')),
        1000
      ),
      2
    ),
    fmt(m((r) => audit(r, 'total-blocking-time'))),
    fmt(
      m((r) => audit(r, 'cumulative-layout-shift')),
      3
    ),
    fmt(
      div(
        m((r) => audit(r, 'total-byte-weight')),
        1024
      )
    ),
  ];
});

const header = [
  'Página · perfil',
  'Rodadas',
  'Desempenho',
  'Acessibilidade',
  'Boas práticas',
  'SEO',
  'FCP (s)',
  'LCP (s)',
  'TBT (ms)',
  'CLS',
  'Peso (KB)',
];

// Falhas de acessibilidade da primeira rodada mobile de cada página.
const a11y = [...groups.entries()]
  .filter(([key]) => key.endsWith('-mobile'))
  .map(([key, reports]) => {
    const r = reports[0];
    const refs = r.categories?.accessibility?.auditRefs ?? [];
    const failing = refs
      .map((ref) => r.audits[ref.id])
      .filter((a) => a && a.score !== null && a.score < 1)
      .map((a) => `\`${a.id}\``);
    return `- **${key}**: ${failing.length ? failing.join(', ') : 'nenhuma'}`;
  });

const md = [
  '## Lighthouse (mediana por página e perfil)',
  '',
  `| ${header.join(' | ')} |`,
  `| ${header.map(() => '---').join(' | ')} |`,
  ...rows.map((r) => `| ${r.join(' | ')} |`),
  '',
  '### Auditorias de acessibilidade que falharam (1ª rodada mobile)',
  '',
  ...a11y,
  '',
].join('\n');

writeFileSync(join(dir, 'summary.md'), md);
process.stdout.write(md);
