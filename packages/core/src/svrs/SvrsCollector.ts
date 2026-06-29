import {
  Catalog,
  CSTAT_DOWN,
  CSTAT_OPERATIONAL,
  CSTAT_SLOWDOWN,
  Environment,
  type AuthorizerCode,
  type DocumentType,
} from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';
import type { CollectedStatus } from '../availability/AvailabilityCollector.js';
import type { SvrsProvider } from './SvrsProvider.js';
import type { SvrsAuthorizer, SvrsAuthorizerStatus } from './SvrsParser.js';

function stateToCStat(state: ServiceState): number | null {
  switch (state) {
    case ServiceState.Operational:
    case ServiceState.Contingency:
      return CSTAT_OPERATIONAL; // 107
    case ServiceState.SlowDown:
      return CSTAT_SLOWDOWN; // 108
    case ServiceState.Down:
      return CSTAT_DOWN; // 109
    default:
      return null;
  }
}

/** Mapeia o autorizador do portal SVRS para o `AuthorizerCode` do catálogo. */
function toAuthorizerCode(a: SvrsAuthorizer): AuthorizerCode {
  return a === 'SEFAZ-RS' ? 'RS' : 'SVRS';
}

/**
 * Coletor de status baseado no portal OFICIAL de disponibilidade do SVRS.
 *
 * O SVRS publica o status por AUTORIZADOR (SEFAZ-RS e o SVRS nacional), não por
 * UF — então expandimos autorizador→UF via `Catalog`, igual ao
 * `AvailabilityCollector`. Cobre as UFs que usam o SVRS como autorizador e os
 * documentos MDF-e/DC-e (nacionais no SVRS). É fonte oficial e independente do
 * IntegraNotas, com `cStat` real — ideal como fonte de PRECEDÊNCIA no consenso.
 */
export class SvrsCollector {
  public readonly name = 'svrs';

  constructor(
    private readonly provider: SvrsProvider,
    private readonly catalog = new Catalog()
  ) {}

  public async collect(): Promise<CollectedStatus[]> {
    const out: CollectedStatus[] = [];

    for (const document of this.provider.supportedDocuments()) {
      let authorizers: SvrsAuthorizerStatus[];
      try {
        authorizers = await this.provider.fetch(document);
      } catch {
        continue; // documento que falha não derruba os demais
      }

      const byCode = new Map<AuthorizerCode, SvrsAuthorizerStatus>(
        authorizers.map((a) => [toAuthorizerCode(a.authorizer), a])
      );
      out.push(...this.expand(document, byCode));
    }

    return out;
  }

  /** Expande o status por-autorizador do SVRS para status por-UF. */
  private expand(
    document: DocumentType,
    byCode: Map<AuthorizerCode, SvrsAuthorizerStatus>
  ): CollectedStatus[] {
    const out: CollectedStatus[] = [];
    for (const entry of this.catalog.list(document, Environment.Production)) {
      const status = byCode.get(entry.authorizer);
      if (!status) {
        continue; // UF cujo autorizador o SVRS não publica
      }
      out.push({
        document: entry.document,
        uf: entry.uf,
        authorizer: entry.authorizer,
        state: status.state,
        // Preferimos o cStat REAL do SVRS; se ausente, derivamos do estado.
        cStat: status.cStat ?? stateToCStat(status.state),
        // O SVRS não publica latência de rede; mantemos 0 (o consenso pode
        // herdar a latência de outra fonte). O timestamp do SVRS fica em
        // `sourceCheckedAt` para o front exibir frescor — ver mapeamento no DTO.
        latencyMs: 0,
        source: 'svrs',
      });
    }
    return out;
  }
}
