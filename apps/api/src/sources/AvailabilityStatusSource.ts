import {
  HttpAvailabilityProvider,
  type AvailabilityRow,
} from '@monitor-sefaz/core';
import {
  Catalog,
  DocumentType,
  Environment,
  type AuthorizerCode,
} from '@monitor-sefaz/catalog';
import { fromEnvironment, type EnvironmentValue, type ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { serviceId } from '../store/mappers.js';
import type { StatusSource } from './StatusSource.js';

/**
 * Fonte baseada no scraping da página oficial de disponibilidade da SEFAZ.
 *
 * As páginas oficiais (NF-e e CT-e) reportam status POR AUTORIZADOR. Como o
 * monitor exibe POR UF, resolvemos, para cada UF de cada documento, qual
 * autorizador a atende (via `Catalog`) e aplicamos o estado daquele autorizador.
 * Funciona sem certificado A1 e em qualquer rede — é a fonte padrão.
 *
 * Cobertura dos 5 documentos:
 * - NF-e e NFC-e: página oficial da NF-e.
 * - CT-e: página oficial da CT-e.
 * - MDF-e e DC-e: são CENTRALIZADOS no SVRS (ambiente nacional único), então
 *   seu estado acompanha o do autorizador SVRS — que já capturamos nas páginas
 *   acima. Reaproveitamos esse estado em vez de raspar o portal SPA do SVRS.
 *
 * A página oficial é de PRODUÇÃO; para homologação não há dados (retorna vazio).
 */
export class AvailabilityStatusSource implements StatusSource {
  public readonly name = 'availability';

  /** Documentos derivados do estado do SVRS (sem página própria de scraping). */
  private static readonly SVRS_DERIVED: DocumentType[] = [DocumentType.MDFe, DocumentType.DCe];

  constructor(
    private readonly provider = new HttpAvailabilityProvider(),
    private readonly catalog = new Catalog(),
    private readonly now: () => number = () => Date.now()
  ) {}

  public async collect(env: EnvironmentValue): Promise<ServiceStatusDTO[]> {
    if (env !== 'producao') {
      return [];
    }

    const checkedAt = new Date(this.now()).toISOString();
    const services: ServiceStatusDTO[] = [];
    // Mapa global de estado por autorizador, agregado de todas as páginas.
    const globalByAuthorizer = new Map<AuthorizerCode, AvailabilityRow>();

    for (const document of this.provider.supportedDocuments()) {
      let rows: AvailabilityRow[];
      try {
        rows = await this.provider.fetch(document);
      } catch {
        // Falha pontual num documento não pode derrubar os demais.
        continue;
      }
      const byAuthorizer = new Map<AuthorizerCode, AvailabilityRow>(
        rows.map((r) => [r.authorizer, r])
      );
      for (const row of rows) {
        globalByAuthorizer.set(row.authorizer, row);
      }
      services.push(...this.expandToUFs(document, byAuthorizer, checkedAt));
    }

    // MDF-e/DC-e: centralizados no SVRS → reaproveita o estado do SVRS já lido.
    for (const document of AvailabilityStatusSource.SVRS_DERIVED) {
      services.push(...this.expandToUFs(document, globalByAuthorizer, checkedAt));
    }

    return services;
  }

  /** Expande o status por-autorizador para um status por-UF de um documento. */
  private expandToUFs(
    document: DocumentType,
    byAuthorizer: Map<AuthorizerCode, AvailabilityRow>,
    checkedAt: string
  ): ServiceStatusDTO[] {
    const out: ServiceStatusDTO[] = [];
    const entries = this.catalog.list(document, Environment.Production);

    for (const entry of entries) {
      const row = byAuthorizer.get(entry.authorizer);
      if (!row) {
        continue; // autorizador não presente na tabela oficial
      }
      out.push({
        id: serviceId(entry.document, entry.uf),
        document: entry.document,
        uf: entry.uf,
        authorizer: entry.authorizer,
        environment: fromEnvironment(entry.environment),
        state: row.state,
        cStat: row.state === 'OPERATIONAL' ? 107 : null,
        xMotivo: null,
        latencyMs: row.tMedSeconds != null ? row.tMedSeconds * 1000 : 0,
        error: null,
        checkedAt,
      });
    }
    return out;
  }
}
