import { DocumentType, type AuthorizerCode, type UF } from './types.js';
import { ALL_UFS } from './uf-info.js';

/**
 * Mapa UF → autorizador, por documento.
 *
 * Vários estados não mantêm autorizador próprio e delegam a um ambiente virtual:
 * - SVAN (Sefaz Virtual do Ambiente Nacional): MA (para NF-e).
 * - SVRS (Sefaz Virtual do RS): a maioria dos demais (AC, AL, AP, DF, ES, PB,
 *   PI, RJ, RN, RO, RR, SC, SE, TO).
 *
 * O mapeamento VARIA por documento — por isso é indexado por `DocumentType`.
 * Estados ausentes do mapa de um documento usam o autorizador padrão (`SVRS`).
 */

/** UFs com autorizador NF-e próprio. */
const NFE_OWN_AUTHORIZERS: UF[] = [
  'AM',
  'BA',
  'CE',
  'GO',
  'MG',
  'MS',
  'MT',
  'PA',
  'PE',
  'PR',
  'RS',
  'SP',
];

function buildNFeAuthorizerMap(): Record<UF, AuthorizerCode> {
  const map = {} as Record<UF, AuthorizerCode>;
  for (const uf of ALL_UFS) {
    if (NFE_OWN_AUTHORIZERS.includes(uf)) {
      map[uf] = uf; // autorizador estadual próprio
    } else if (uf === 'MA') {
      map[uf] = 'SVAN';
    } else {
      map[uf] = 'SVRS';
    }
  }
  return map;
}

const NFE_AUTHORIZERS = buildNFeAuthorizerMap();

/** UFs com autorizador CT-e próprio; as demais delegam ao SVRS. */
const CTE_OWN_AUTHORIZERS: UF[] = ['MG', 'MS', 'MT', 'PR', 'RS', 'SP'];

function buildCTeAuthorizerMap(): Record<UF, AuthorizerCode> {
  const map = {} as Record<UF, AuthorizerCode>;
  for (const uf of ALL_UFS) {
    map[uf] = CTE_OWN_AUTHORIZERS.includes(uf) ? uf : 'SVRS';
  }
  return map;
}

/**
 * MDF-e e DC-e são centralizados: todas as UFs são atendidas pelo SVRS.
 */
function buildCentralizedSVRSMap(): Record<UF, AuthorizerCode> {
  const map = {} as Record<UF, AuthorizerCode>;
  for (const uf of ALL_UFS) {
    map[uf] = 'SVRS';
  }
  return map;
}

const CTE_AUTHORIZERS = buildCTeAuthorizerMap();
const CENTRALIZED_SVRS = buildCentralizedSVRSMap();

/**
 * Autorizador padrão usado quando uma UF não está mapeada explicitamente
 * para um documento.
 */
export const DEFAULT_AUTHORIZER: AuthorizerCode = 'SVRS';

export const UF_AUTHORIZERS: Readonly<
  Record<DocumentType, Partial<Record<UF, AuthorizerCode>>>
> = {
  // NFC-e segue o mesmo mapeamento de autorizadores da NF-e na consulta de status.
  [DocumentType.NFe]: NFE_AUTHORIZERS,
  [DocumentType.NFCe]: NFE_AUTHORIZERS,
  [DocumentType.CTe]: CTE_AUTHORIZERS,
  [DocumentType.MDFe]: CENTRALIZED_SVRS,
  [DocumentType.DCe]: CENTRALIZED_SVRS,
};

/**
 * Códigos IBGE (`cUF`) dos autorizadores virtuais/nacionais, usados no envelope
 * SOAP quando o alvo não corresponde a uma UF física.
 */
export const VIRTUAL_AUTHORIZER_CUF: Partial<Record<AuthorizerCode, number>> = {
  SVAN: 91,
  AN: 91,
  SVCAN: 91,
  SVRS: 90,
  SVCRS: 90,
};
