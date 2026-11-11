import {
  ALL_UFS,
  Catalog,
  DocumentType,
  Environment,
  type AuthorizerCode,
  type UF,
} from '@monitor-sefaz/catalog';
import type { ServiceState } from '../domain/types.js';
import { AvailabilityParser } from '../availability/AvailabilityParser.js';
import {
  AVAILABILITY_URLS,
  HOMOLOGATION_AVAILABILITY_URLS,
} from '../availability/AvailabilityProvider.js';
import { SvrsParser, type SvrsAuthorizer } from '../svrs/SvrsParser.js';
import { SVRS_URLS, type SvrsFetcher } from '../svrs/SvrsProvider.js';

/** Uma operação de um autorizador, como a fonte a publica. */
export interface OperationStatus {
  readonly operation: string;
  readonly state: ServiceState;
  readonly cStat: number | null;
  readonly sourceCheckedAt?: string;
}

/** As operações de um autorizador num documento e ambiente, segundo uma fonte. */
export interface AuthorizerDetail {
  readonly document: DocumentType;
  readonly authorizer: AuthorizerCode;
  readonly environment: Environment;
  readonly source: 'svrs' | 'availability';
  /** UFs que esse autorizador atende neste documento, segundo o catálogo. */
  readonly ufs: UF[];
  readonly operations: OperationStatus[];
}

/** Páginas já baixadas numa rodada, por URL. */
export type PageLog = Map<string, string>;

/** Busca uma página de homologação da Receita (o consenso não as baixa). */
export type HomologationFetcher = (url: string, document: DocumentType) => Promise<string>;

/** Envolve um fetcher do SVRS para guardar cada página que ele baixa. */
export function recordingSvrsFetcher(fetcher: SvrsFetcher, pages: PageLog): SvrsFetcher {
  return async (url) => {
    const html = await fetcher(url);
    pages.set(url, html);
    return html;
  };
}

/**
 * Cada URL pertence ao primeiro documento que a usa. Quando dois documentos
 * apontam para a mesma página (o DC-e usa a do MDF-e no SVRS; a NFC-e usa a da
 * NF-e na Receita), o detalhe sai só para o dono da página: repetir as
 * operações com o nome de outro documento seria inventar um dado.
 */
function nativePages(urls: Partial<Record<DocumentType, string | readonly string[]>>) {
  const seen = new Set<string>();
  const out: [DocumentType, string][] = [];
  for (const [document, value] of Object.entries(urls) as [
    DocumentType,
    string | readonly string[],
  ][]) {
    const url = typeof value === 'string' ? value : value[0];
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push([document, url]);
  }
  return out;
}

const svrsCode = (a: SvrsAuthorizer): AuthorizerCode => (a === 'SEFAZ-RS' ? 'RS' : 'SVRS');

/** O rótulo do SVRS sem o sufixo "(URL)" que ele põe em alguns webservices. */
const cleanOperation = (label: string): string => label.replace(/\s*\(URL\)/i, '').trim();

/**
 * Camada de detalhe por autorizador × ambiente × serviço (ADR-2). Não baixa nada
 * de produção: lê as páginas que o consenso já baixou na rodada (`PageLog`). Só
 * as duas páginas de homologação da Receita, que o consenso não usa, são
 * buscadas aqui.
 */
export class DetailCollector {
  private readonly svrsParser = new SvrsParser();
  private readonly availabilityParser = new AvailabilityParser();

  constructor(private readonly catalog = new Catalog()) {}

  /** UFs atendidas por um autorizador num documento (inclui a contingência SVC). */
  public ufsOf(document: DocumentType, authorizer: AuthorizerCode, environment: Environment): UF[] {
    const direct = this.catalog
      .list(document, environment)
      .filter((e) => e.authorizer === authorizer)
      .map((e) => e.uf);
    if (direct.length > 0) return direct;
    return ALL_UFS.filter((uf) => this.catalog.resolveContingency(document, uf) === authorizer);
  }

  /** Detalhe de produção a partir das páginas da rodada. */
  public fromPages(pages: ReadonlyMap<string, string>): AuthorizerDetail[] {
    const out: AuthorizerDetail[] = [];
    for (const [document, url] of nativePages(SVRS_URLS)) {
      const html = pages.get(url);
      if (!html) continue;
      for (const a of this.svrsParser.parse(html)) {
        const authorizer = svrsCode(a.authorizer);
        out.push({
          document,
          authorizer,
          environment: Environment.Production,
          source: 'svrs',
          ufs: this.ufsOf(document, authorizer, Environment.Production),
          operations: a.webServices.map((w) => ({
            operation: cleanOperation(w.operation),
            state: w.state,
            cStat: w.cStat,
            ...(w.lastCheckTime ? { sourceCheckedAt: w.lastCheckTime } : {}),
          })),
        });
      }
    }
    for (const [document, url] of nativePages(AVAILABILITY_URLS)) {
      const html = pages.get(url);
      if (html) out.push(...this.fromReceita(document, html, Environment.Production));
    }
    return out;
  }

  /**
   * Detalhe completo da rodada: o de produção (das páginas já baixadas) mais o de
   * homologação da Receita. Uma página de homologação que falha só fica de fora.
   */
  public async collect(
    pages: ReadonlyMap<string, string>,
    fetchHomologation?: HomologationFetcher
  ): Promise<AuthorizerDetail[]> {
    const out = this.fromPages(pages);
    if (!fetchHomologation) return out;
    for (const [document, url] of nativePages(HOMOLOGATION_AVAILABILITY_URLS)) {
      try {
        const html = await fetchHomologation(url, document);
        out.push(...this.fromReceita(document, html, Environment.Homologation));
      } catch {
        // Homologação fora do ar não derruba o detalhe de produção.
      }
    }
    return out;
  }

  private fromReceita(
    document: DocumentType,
    html: string,
    environment: Environment
  ): AuthorizerDetail[] {
    return this.availabilityParser.parseOperations(html).map((row) => ({
      document,
      authorizer: row.authorizer,
      environment,
      source: 'availability' as const,
      ufs: this.ufsOf(document, row.authorizer, environment),
      operations: row.operations.map((o) => ({ ...o, cStat: null })),
    }));
  }
}
