import {
  Catalog,
  DocumentType,
  Environment,
  type AuthorizerCode,
  type UF,
} from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';
import type { AvailabilityRow } from './AvailabilityParser.js';

/** Status coletado de um serviço (documento + UF), pronto para virar DTO. */
export interface CollectedStatus {
  readonly document: DocumentType;
  readonly uf: UF;
  readonly authorizer: AuthorizerCode;
  readonly state: ServiceState;
  readonly cStat: number | null;
  /** Latência aproximada derivada do tMed reportado (ms), quando houver. */
  readonly latencyMs: number;
}

/**
 * Contrato mínimo de um provider de disponibilidade. Implementado pelo
 * `HttpAvailabilityProvider` (Node, axios) e pelo provider do Cloudflare Worker
 * (fetch nativo) — por isso o collector recebe a abstração, não a implementação.
 */
export interface AvailabilityProviderLike {
  supportedDocuments(): DocumentType[];
  fetch(document: DocumentType): Promise<AvailabilityRow[]>;
}

/**
 * Coletor de status baseado nas páginas oficiais de disponibilidade da SEFAZ.
 *
 * Reúne a lógica que era específica da API para que API, Cloudflare Worker e
 * GitHub Actions usem exatamente o mesmo motor (sem duplicação). Não depende de
 * `@monitor-sefaz/contracts` — devolve um tipo próprio (`CollectedStatus`) que
 * cada consumidor adapta para o seu formato de saída.
 *
 * Cobertura: NF-e/NFC-e (página da NF-e), CT-e (página da CT-e) e MDF-e/DC-e
 * derivados do autorizador SVRS (ambiente nacional desses documentos).
 */
export class AvailabilityCollector {
  /** Documentos derivados do estado do SVRS (sem página própria). */
  private static readonly SVRS_DERIVED: DocumentType[] = [DocumentType.MDFe, DocumentType.DCe];

  constructor(
    private readonly provider: AvailabilityProviderLike,
    private readonly catalog = new Catalog()
  ) {}

  /**
   * Coleta o status de produção de todos os documentos cobertos.
   * Uma falha pontual num documento não derruba os demais.
   */
  public async collect(): Promise<CollectedStatus[]> {
    const out: CollectedStatus[] = [];
    const globalByAuthorizer = new Map<AuthorizerCode, AvailabilityRow>();

    for (const document of this.provider.supportedDocuments()) {
      let rows: AvailabilityRow[];
      try {
        rows = await this.provider.fetch(document);
      } catch {
        continue;
      }
      const byAuthorizer = new Map(rows.map((r) => [r.authorizer, r]));
      for (const row of rows) {
        globalByAuthorizer.set(row.authorizer, row);
      }
      out.push(...this.expand(document, byAuthorizer));
    }

    for (const document of AvailabilityCollector.SVRS_DERIVED) {
      out.push(...this.expand(document, globalByAuthorizer));
    }

    return out;
  }

  /** Expande o status por-autorizador para status por-UF de um documento. */
  private expand(
    document: DocumentType,
    byAuthorizer: Map<AuthorizerCode, AvailabilityRow>
  ): CollectedStatus[] {
    const out: CollectedStatus[] = [];
    for (const entry of this.catalog.list(document, Environment.Production)) {
      const row = byAuthorizer.get(entry.authorizer);
      if (!row) {
        continue;
      }
      out.push({
        document: entry.document,
        uf: entry.uf,
        authorizer: entry.authorizer,
        state: row.state,
        cStat: row.state === ServiceState.Operational ? 107 : null,
        latencyMs: row.tMedSeconds != null ? row.tMedSeconds * 1000 : 0,
      });
    }
    return out;
  }
}
