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

/** O detalhe ao lado do mapa: o estado em foco, ou o resumo do país. */
export function MapDetail({ uf, services, documents, loading }: MapDetailProps) {
  if (loading) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
        Carregando o status dos estados…
      </p>
    );
  }

  if (!uf) {
    const byUf = new Map<string, ServiceStatusDTO[]>();
    for (const s of services) byUf.set(s.uf, [...(byUf.get(s.uf) ?? []), s]);
    const failingUfs = [...byUf.entries()]
      .filter(([, list]) => list.some((s) => !isUp(s.state)))
      .map(([u]) => u as UF)
      .sort((a, b) => (UF_NAME[a] ?? a).localeCompare(UF_NAME[b] ?? b, 'pt-BR'));
    const up = services.filter((s) => isUp(s.state)).length;
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold">Brasil agora</h3>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Passe o mouse ou toque num estado para ver os detalhes dele.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {[
            ['Estados no ar', `${byUf.size - failingUfs.length}`],
            ['Com problema', `${failingUfs.length}`],
            ['Serviços no ar', `${up}/${services.length}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl p-2.5"
              style={{ background: 'var(--surface-2)' }}
            >
              <dt
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-dim)' }}
              >
                {label}
              </dt>
              <dd className="font-mono text-lg font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        {failingUfs.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">Estados com problema</p>
            <UfChipLinks ufs={failingUfs} label="Estados com problema" />
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Nenhum estado com problema agora.
          </p>
        )}
      </div>
    );
  }

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
