import type {
  AuthorizerDetailDTO,
  DetailSnapshotDTO,
  ServiceStatusDTO,
} from '@monitor-sefaz/contracts';

/** O que o painel de um serviço mostra da camada de detalhe. */
export interface ServiceDetailView {
  /** O autorizador do serviço, em produção. */
  primary: AuthorizerDetailDTO | null;
  /** Os outros autorizadores que atendem a UF neste documento (a contingência SVC). */
  contingency: AuthorizerDetailDTO[];
  /** O autorizador do serviço, em homologação (só a Receita publica). */
  homologation: AuthorizerDetailDTO | null;
}

/**
 * Precedência entre fontes para o mesmo autorizador: a mesma do consenso
 * (SVRS antes da Receita). O SVRS publica o horário da aferição e o cStat.
 */
const SOURCE_RANK: Record<string, number> = { svrs: 0, availability: 1 };

const rank = (d: AuthorizerDetailDTO): number => SOURCE_RANK[d.source] ?? 9;

/** Um detalhe por autorizador, ficando com o da fonte de maior precedência. */
function bestPerAuthorizer(details: AuthorizerDetailDTO[]): AuthorizerDetailDTO[] {
  const best = new Map<string, AuthorizerDetailDTO>();
  for (const d of details) {
    const current = best.get(d.authorizer);
    if (!current || rank(d) < rank(current)) best.set(d.authorizer, d);
  }
  return [...best.values()];
}

/**
 * Escolhe, no `details.json`, o que interessa ao serviço `documento:UF`: o
 * autorizador dele, os de contingência que também atendem a UF, e a
 * homologação do autorizador dele.
 */
export function detailFor(
  snapshot: DetailSnapshotDTO | undefined,
  service: Pick<ServiceStatusDTO, 'document' | 'uf' | 'authorizer'>
): ServiceDetailView {
  const empty: ServiceDetailView = { primary: null, contingency: [], homologation: null };
  if (!snapshot) return empty;
  const relevant = snapshot.authorizers.filter(
    (d) => d.document === service.document && d.ufs.includes(service.uf)
  );
  const production = bestPerAuthorizer(relevant.filter((d) => d.environment === 'production'));
  const homologation = bestPerAuthorizer(relevant.filter((d) => d.environment === 'homologation'));
  return {
    primary: production.find((d) => d.authorizer === service.authorizer) ?? null,
    contingency: production
      .filter((d) => d.authorizer !== service.authorizer)
      .sort((a, b) => a.authorizer.localeCompare(b.authorizer)),
    homologation: homologation.find((d) => d.authorizer === service.authorizer) ?? null,
  };
}

/** `true` quando não há nada para mostrar do detalhe. */
export function isEmptyDetail(view: ServiceDetailView): boolean {
  return !view.primary && view.contingency.length === 0 && !view.homologation;
}

/** Rótulo da operação sem o prefixo "WS " que o SVRS põe em todas. */
export function operationLabel(operation: string): string {
  return operation.replace(/^WS\s+/i, '').trim();
}

/** De onde veio o detalhe, em texto de interface. */
export const DETAIL_SOURCE_LABEL: Record<string, string> = {
  svrs: 'portal do SVRS',
  availability: 'portal da Receita',
};
