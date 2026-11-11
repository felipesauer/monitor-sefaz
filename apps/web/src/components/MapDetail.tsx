import { CheckCircle2, MousePointerClick } from 'lucide-react';
import type { DocumentType, UF } from '@monitor-sefaz/catalog';
import { isUp, type ServiceStateValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { STATE_META, STATE_SEVERITY, stateTextColor } from './serviceState.js';
import { ButtonLink } from './ButtonLink.js';
import { UfChipLinks } from './UfChipLinks.js';
import { authorizerLabel, DOC_LABEL, formatLatency, UF_NAME } from '../lib/labels.js';
import { ufAuthorizations } from '../lib/ufFacts.js';
import { pageHref } from '../lib/pages.js';

interface MapDetailProps {
  /** O estado em foco no mapa (mouse, teclado ou clique); null mostra o resumo do país. */
  uf: UF | null;
  services: ServiceStatusDTO[];
  documents: readonly DocumentType[];
  loading?: boolean;
}

const worstOf = (list: ServiceStatusDTO[]): ServiceStateValue | null =>
  list.reduce<ServiceStateValue | null>(
    (w, s) => (!w || STATE_SEVERITY[s.state] > STATE_SEVERITY[w] ? s.state : w),
    null
  );

function Pill({ state, children }: { state: ServiceStateValue; children: string }) {
  const color = STATE_META[state].color;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color: stateTextColor(color),
      }}
    >
      {children}
    </span>
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const STATE_ORDER: ServiceStateValue[] = [
  'OPERATIONAL',
  'CONTINGENCY',
  'SLOWDOWN',
  'DOWN',
  'ERROR',
];

/**
 * "Brasil agora": o resumo do país ao lado do mapa, enquanto nenhum estado
 * está em foco. Destaque com o estado geral, os números, a distribuição dos
 * serviços por estado, cada documento e os estados com problema.
 */
function CountryOverview({
  services,
  documents,
}: {
  services: ServiceStatusDTO[];
  documents: readonly DocumentType[];
}) {
  const byUf = new Map<string, ServiceStatusDTO[]>();
  for (const s of services) byUf.set(s.uf, [...(byUf.get(s.uf) ?? []), s]);
  const failingUfs = [...byUf.entries()]
    .filter(([, list]) => list.some((s) => !isUp(s.state)))
    .map(([u]) => u as UF)
    .sort((a, b) => (UF_NAME[a] ?? a).localeCompare(UF_NAME[b] ?? b, 'pt-BR'));
  const total = services.length;
  const up = services.filter((s) => isUp(s.state)).length;
  const pct = total ? Math.round((up / total) * 1000) / 10 : 0;
  const worst = worstOf(services.filter((s) => !isUp(s.state)));
  const heroState: ServiceStateValue = worst ?? 'OPERATIONAL';
  const meta = STATE_META[heroState];
  const Icon = meta.icon;
  const counts = STATE_ORDER.map((state) => ({
    state,
    count: services.filter((s) => s.state === state).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-start gap-3 rounded-xl border p-3.5"
        style={{
          background: `color-mix(in srgb, ${meta.color} 9%, var(--surface))`,
          borderColor: `color-mix(in srgb, ${meta.color} 35%, var(--border))`,
        }}
      >
        <Icon
          className="mt-0.5 h-6 w-6 shrink-0"
          style={{ color: meta.color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-dim)' }}
          >
            Brasil agora
          </p>
          <h3
            className="text-base font-bold leading-tight"
            style={{ color: stateTextColor(meta.color) }}
          >
            {failingUfs.length === 0
              ? 'Tudo no ar'
              : `${failingUfs.length} ${failingUfs.length > 1 ? 'estados' : 'estado'} com problema`}
          </h3>
          <p className="mt-0.5 text-xs [text-wrap:pretty]" style={{ color: 'var(--text-dim)' }}>
            {up} de {total} serviços operando em {byUf.size} estados.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          ['estados no ar', `${byUf.size - failingUfs.length}/${byUf.size}`],
          ['serviços no ar', `${up}/${total}`],
          ['operando', `${pct}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex min-w-0 flex-col gap-0.5 rounded-xl px-2.5 py-2"
            style={{ background: 'var(--surface-2)' }}
          >
            <dt className="order-2 text-[11px] leading-tight" style={{ color: 'var(--text-dim)' }}>
              {label}
            </dt>
            <dd className="order-1 whitespace-nowrap text-base font-bold leading-tight tabular-nums sm:text-lg">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold">Serviços por situação</p>
        <div
          className="flex h-2.5 gap-[2px] overflow-hidden rounded-full"
          role="img"
          aria-label={counts.map((c) => `${STATE_META[c.state].label}: ${c.count}`).join(', ')}
        >
          {counts.map((c) => (
            <span
              key={c.state}
              style={{ flexGrow: c.count, background: STATE_META[c.state].color }}
            />
          ))}
        </div>
        <ul
          className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]"
          style={{ color: 'var(--text-dim)' }}
        >
          {counts.map((c) => (
            <li key={c.state} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: STATE_META[c.state].color }}
                aria-hidden="true"
              />
              {STATE_META[c.state].label}
              <strong className="font-semibold" style={{ color: 'var(--text)' }}>
                {c.count}
              </strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold">Por documento</p>
        <ul className="flex flex-col gap-1">
          {documents.map((document) => {
            const list = services.filter((s) => s.document === document);
            const ok = list.filter((s) => isUp(s.state)).length;
            const docWorst = worstOf(list.filter((s) => !isUp(s.state)));
            const color = docWorst ? STATE_META[docWorst].color : 'var(--ok)';
            return (
              <li
                key={document}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.75rem] items-center gap-2 text-xs"
              >
                <span className="font-semibold">{DOC_LABEL[document] ?? document}</span>
                <span
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: 'var(--surface-2)' }}
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: list.length ? `${(ok / list.length) * 100}%` : '0%',
                      background: color,
                    }}
                  />
                </span>
                <span
                  className="text-right font-mono tabular-nums"
                  style={{ color: docWorst ? stateTextColor(color) : 'var(--text-dim)' }}
                >
                  {list.length ? `${ok}/${list.length}` : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {failingUfs.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold">Estados com problema</p>
          <UfChipLinks ufs={failingUfs} label="Estados com problema" />
        </div>
      ) : (
        <p
          className="flex items-center gap-1.5 text-xs"
          style={{ color: stateTextColor('var(--ok)') }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Nenhum estado com problema agora.
        </p>
      )}

      <p
        className="flex items-center gap-1.5 border-t pt-3 text-[11px]"
        style={{ color: 'var(--text-dim)', borderColor: 'var(--border)' }}
      >
        <MousePointerClick className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Passe o mouse ou toque num estado do mapa para ver os detalhes dele.
      </p>
    </div>
  );
}

/** O detalhe ao lado do mapa: o estado em foco, ou o resumo do país. */
export function MapDetail({ uf, services, documents, loading }: MapDetailProps) {
  if (loading) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
        Carregando o status dos estados…
      </p>
    );
  }

  if (!uf) return <CountryOverview services={services} documents={documents} />;

  const name = UF_NAME[uf] ?? uf;
  const own = services.filter((s) => s.uf === uf);
  const worst = worstOf(own);
  const failing = own.filter((s) => !isUp(s.state)).length;
  const latency = median(own.map((s) => s.latencyMs).filter((v) => v >= 0));
  const authorizers = new Map(ufAuthorizations(uf).map((a) => [a.document, a.authorizer]));

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}flags/${uf.toLowerCase()}.png`}
          alt={`Bandeira de ${name}`}
          width={40}
          height={28}
          className="h-7 w-10 shrink-0 rounded object-cover"
          style={{ boxShadow: '0 0 0 1px var(--border)' }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight">{name}</h3>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {uf}
            {latency !== null &&
              ` · acesso mediano ${formatLatency(latency).value} ${formatLatency(latency).unit}`}
          </p>
        </div>
        {worst && (
          <Pill state={failing ? worst : 'OPERATIONAL'}>
            {failing ? `${failing} com problema` : 'Tudo no ar'}
          </Pill>
        )}
      </div>

      <ul
        className="flex flex-col divide-y rounded-xl border"
        style={{ borderColor: 'var(--border)' }}
      >
        {documents.map((document) => {
          const s = own.find((x) => x.document === document);
          const meta = s ? STATE_META[s.state] : null;
          return (
            <li
              key={document}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: meta ? meta.color : 'var(--border)' }}
                  aria-hidden="true"
                />
                <span className="font-semibold">{DOC_LABEL[document] ?? document}</span>
                <span className="truncate text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  {authorizerLabel(s?.authorizer ?? authorizers.get(document) ?? uf)}
                </span>
              </span>
              <span
                className="shrink-0 text-xs font-semibold"
                style={{ color: meta ? stateTextColor(meta.color) : 'var(--text-dim)' }}
              >
                {meta ? meta.label : 'Sem leitura'}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`#uf-${uf}`} variant="primary">
          Ver os cards de {uf}
        </ButtonLink>
        <ButtonLink href={pageHref({ kind: 'uf', uf })} arrow>
          Página da SEFAZ-{uf}
        </ButtonLink>
      </div>
    </div>
  );
}
