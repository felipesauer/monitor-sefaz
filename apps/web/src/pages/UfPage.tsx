import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { DocumentType, type UF } from '@monitor-sefaz/catalog';
import { isUp, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { POLL_INTERVAL_MS, useHistorySeries, useStatusSnapshot } from '../hooks/useStatus.js';
import { useTheme } from '../hooks/useTheme.js';
import { Header } from '../components/Header.js';
import { UpdateInfo } from '../components/UpdateInfo.js';
import { StatusLegend } from '../components/StatusLegend.js';
import { ServiceGrid } from '../components/ServiceGrid.js';
import { ServiceDetailPanel } from '../components/ServiceDetailPanel.js';
import { NoScriptNotice } from '../components/NoScriptNotice.js';
import { UfDirectory } from '../components/UfDirectory.js';
import { Footer } from '../components/Footer.js';
import { STATE_META, STATE_SEVERITY } from '../components/serviceState.js';
import {
  AUTHORIZER_NAME,
  DOC_DESCRIPTION,
  DOC_LABEL,
  authorizerLabel,
  inUf,
  ofUf,
} from '../lib/labels.js';
import { HOME, pageHref } from '../lib/pages.js';
import {
  DOCUMENTS,
  nfeContingency,
  ufAuthorizations,
  ufsSharingAuthorizer,
} from '../lib/ufFacts.js';

/** Valor do campo tpEmis da NF-e emitida em cada SVC (Manual do Contribuinte). */
const SVC_TP_EMIS: Record<string, number> = { SVCAN: 6, SVCRS: 7 };

/** "AL, AP, CE e TO", cada sigla com link para a página da UF. */
function ufLinks(ufs: readonly UF[]): ReactNode {
  return ufs.map((uf, i) => (
    <Fragment key={uf}>
      {i > 0 && (i === ufs.length - 1 ? ' e ' : ', ')}
      <a
        href={pageHref({ kind: 'uf', uf })}
        title={`Status da SEFAZ-${uf}`}
        className="font-mono hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        {uf}
      </a>
    </Fragment>
  ));
}

/** Quem mais cai junto quando o autorizador da NF-e da UF cai. */
function NfeSharing({ uf }: { uf: UF }) {
  const nfe = ufAuthorizations(uf).find((a) => a.document === DocumentType.NFe);
  if (!nfe) return null;
  if (nfe.own) {
    // Só o fato do catalog: "não cai junto com ninguém" seria prometer demais — a
    // SEFAZ-RS, por exemplo, responde no mesmo host do SVRS.
    return (
      <>
        A NF-e {ofUf(uf)} é autorizada pela própria SEFAZ-{uf}, e não por um ambiente virtual como o
        SVRS, que atende vários estados de uma vez.
      </>
    );
  }
  const label = authorizerLabel(nfe.authorizer);
  const others = ufsSharingAuthorizer(DocumentType.NFe, uf);
  if (others.length === 0) {
    return (
      <>
        A NF-e {ofUf(uf)} é autorizada pelo {label}, que não atende outros estados.
      </>
    );
  }
  return (
    <>
      A NF-e {ofUf(uf)} é autorizada pelo {label}, que atende também {ufLinks(others)}. Quando o{' '}
      {label} cai, todos esses estados ficam sem NF-e ao mesmo tempo.
    </>
  );
}

/** Resumo do momento, só com os serviços da UF. */
function UfBanner({ uf, services }: { uf: UF; services: ServiceStatusDTO[] }) {
  // Mesmo critério do banner da home: contingência está no ar, não é problema.
  const failing = services.filter((s) => !isUp(s.state));
  const worst = failing.reduce<ServiceStatusDTO | undefined>(
    (w, s) => (!w || STATE_SEVERITY[s.state] > STATE_SEVERITY[w.state] ? s : w),
    undefined
  );
  const { color, title, Icon } = worst
    ? {
        color: STATE_META[worst.state].color,
        title: `Há serviços com problema ${inUf(uf)} agora`,
        Icon: worst.state === 'DOWN' ? XCircle : AlertTriangle,
      }
    : {
        color: 'var(--ok)',
        title: `Todos os serviços ${ofUf(uf)} estão no ar`,
        Icon: CheckCircle2,
      };

  return (
    <div
      className="flex items-start gap-3 rounded-xl border p-4"
      role="status"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${color} 40%, var(--border))`,
      }}
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0" style={{ color }} />
      <div className="min-w-0">
        <strong className="block text-sm font-semibold">{title}</strong>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {services.length - failing.length} de {services.length} serviços no ar
        </span>
        {failing.length > 0 && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            Com problema:{' '}
            <span style={{ color }}>
              {failing
                .map((s) => `${DOC_LABEL[s.document] ?? s.document} (${STATE_META[s.state].label})`)
                .join(', ')}
            </span>
            .
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Página de uma UF: status ao vivo dos cinco documentos no estado, mais o que
 * não depende de JS — quem autoriza cada documento, o que fazer quando a
 * SEFAZ cai e links para as outras UFs. É ela que responde a buscas como
 * "sefaz sp fora do ar", que a home, genérica, não alcança.
 */
export function UfPage({ uf }: { uf: UF }) {
  const { toggle } = useTheme();
  const queryClient = useQueryClient();

  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<ServiceStatusDTO | null>(null);

  // O mesmo snapshot da home, filtrado aqui: o Worker ignora ?uf= e coleta
  // tudo de qualquer jeito, e repetir a URL aproveita o cache HTTP.
  const refresh = paused ? false : POLL_INTERVAL_MS;
  const status = useStatusSnapshot(refresh);
  const series = useHistorySeries();

  const services = useMemo(
    () =>
      (status.data?.services ?? [])
        .filter((s) => s.uf === uf)
        .sort((a, b) => DOCUMENTS.indexOf(a.document) - DOCUMENTS.indexOf(b.document)),
    [status.data, uf]
  );
  const selectedLive = selected ? (services.find((s) => s.id === selected.id) ?? selected) : null;

  const sefaz = `SEFAZ-${uf}`;
  const svc = nfeContingency(uf);
  const homeHref = pageHref(HOME);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        homeHref={homeHref}
        onToggleTheme={toggle}
        generatedAt={status.data?.generatedAt}
        refreshLabel={paused ? 'Atualização pausada' : 'Atualização automática'}
        paused={paused}
        onTogglePause={() => setPaused((v) => !v)}
        onRefresh={() => void queryClient.invalidateQueries()}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6">
        <nav
          aria-label="Trilha de navegação"
          className="text-xs"
          style={{ color: 'var(--text-dim)' }}
        >
          <a href={homeHref} className="hover:underline" style={{ color: 'var(--accent)' }}>
            Monitor SEFAZ
          </a>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{sefaz}</span>
        </nav>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight">Status da {sefaz} agora</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            A SEFAZ {ofUf(uf)} está fora do ar ou instável? Acompanhe ao vivo a disponibilidade da
            NF-e, NFC-e, CT-e, MDF-e e DC-e {inUf(uf)}, com o status lido das fontes públicas da
            SEFAZ (sem certificado digital) e atualizado a cada minuto.
          </p>
        </div>

        {status.data && services.length > 0 && <UfBanner uf={uf} services={services} />}
        {status.data && (
          <UpdateInfo generatedAt={status.data.generatedAt} refreshIntervalMs={POLL_INTERVAL_MS} />
        )}

        <StatusLegend />

        {status.isLoading && (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
            Carregando o status ao vivo…
          </p>
        )}
        <NoScriptNotice />
        {status.isError && (
          <p className="py-10 text-center text-sm" style={{ color: 'var(--down)' }}>
            Não foi possível carregar o status. Tente novamente.
          </p>
        )}
        {status.data &&
          (services.length > 0 ? (
            <ServiceGrid services={services} series={series.data ?? {}} onSelect={setSelected} />
          ) : (
            <p className="py-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
              A última leitura não trouxe serviços {ofUf(uf)}.
            </p>
          ))}

        <section
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <h2 className="text-base font-semibold">
            Quem autoriza os documentos fiscais {ofUf(uf)}
          </h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                <th scope="col" className="pb-2 pr-4 font-semibold">
                  Documento
                </th>
                <th scope="col" className="pb-2 font-semibold">
                  Autorizador
                </th>
              </tr>
            </thead>
            <tbody>
              {ufAuthorizations(uf).map(({ document, authorizer, own }) => (
                <tr key={document} className="border-t align-top">
                  <th scope="row" className="py-2.5 pr-4 font-normal">
                    <span className="font-semibold">{DOC_LABEL[document]}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-dim)' }}>
                      {DOC_DESCRIPTION[document]}
                    </span>
                  </th>
                  <td className="py-2.5">
                    <span className="font-mono font-semibold">{authorizerLabel(authorizer)}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-dim)' }}>
                      {own ? 'Autorizador próprio do estado' : AUTHORIZER_NAME[authorizer]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            <NfeSharing uf={uf} />
          </p>
        </section>

        <section
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <h2 className="text-base font-semibold">O que fazer quando a {sefaz} cai</h2>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed">
            <li>
              <strong>Confirme se o problema é da SEFAZ.</strong> Se o status acima está verde, a
              falha tende a estar no certificado digital, na conexão ou no emissor.
            </li>
            <li>
              <strong>Instabilidade costuma passar rápido.</strong> Com o serviço instável (cStat
              108), espere alguns minutos e reenvie. Não cancele nem reemita a nota por causa da
              demora: isso pode gerar duplicidade.
            </li>
            {svc && (
              <li>
                <strong>
                  Na NF-e, a contingência {ofUf(uf)} é o {authorizerLabel(svc)}.
                </strong>{' '}
                Numa paralisação longa, a SEFAZ ativa a emissão pelo {authorizerLabel(svc)} (tpEmis{' '}
                {SVC_TP_EMIS[svc]}): acompanhe o aviso e ajuste o emissor. Sem SVC ativa, dá para
                emitir em EPEC ou FS-DA.
              </li>
            )}
            <li>
              <strong>A NFC-e não usa SVC.</strong> A saída é a contingência off-line (tpEmis 9):
              emita e transmita as notas assim que o serviço voltar, dentro do prazo da legislação{' '}
              {ofUf(uf)}.
            </li>
            <li>
              <strong>CT-e e MDF-e têm contingência própria:</strong> SVC, EPEC ou FS-DA no CT-e, e
              emissão off-line no MDF-e.
            </li>
          </ol>
        </section>

        <section
          className="rounded-xl border p-4 sm:p-5"
          style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
        >
          <h2 className="text-base font-semibold">A SEFAZ nos outros estados</h2>
          <p className="mb-4 mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
            Cada UF tem a sua página. Para ver as 27 de uma vez, abra o{' '}
            <a href={homeHref} className="hover:underline" style={{ color: 'var(--accent)' }}>
              painel completo
            </a>
            .
          </p>
          <UfDirectory current={uf} />
        </section>
      </main>

      <Footer />

      {selectedLive && (
        <ServiceDetailPanel service={selectedLive} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
