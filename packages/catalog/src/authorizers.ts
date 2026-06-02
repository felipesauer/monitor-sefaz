import { DocumentType, type AuthorizerCode, type UF } from './types.js';
import { ALL_UFS } from './uf-info.js';

/**
 * Mapa UF → autorizador, por documento.
 *
 * Vários estados não mantêm autorizador próprio e delegam a um ambiente virtual:
 * - SVAN (Sefaz Virtual do Ambiente Nacional): MA (apenas NF-e modelo 55).
 * - SVRS (Sefaz Virtual do RS): a grande maioria dos demais.
 *
 * O mapeamento VARIA por documento — e até por modelo: NF-e (55) e NFC-e (65)
 * divergem (ex: BA e PE têm ambiente próprio só na NF-e; MA usa SVAN na NF-e e
 * SVRS na NFC-e). Fonte: nfephp-org/sped-nfe (storage/autorizadores.json).
 */

/** UFs com autorizador próprio na NF-e (modelo 55). */
const NFE_OWN_AUTHORIZERS: UF[] = ['AM', 'BA', 'GO', 'MG', 'MS', 'MT', 'PE', 'PR', 'RS', 'SP'];

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

/** UFs com autorizador próprio na NFC-e (modelo 65) — BA, PE e MA delegam aqui. */
const NFCE_OWN_AUTHORIZERS: UF[] = ['AM', 'GO', 'MG', 'MS', 'MT', 'PR', 'RS', 'SP'];

function buildNFCeAuthorizerMap(): Record<UF, AuthorizerCode> {
  const map = {} as Record<UF, AuthorizerCode>;
  for (const uf of ALL_UFS) {
    map[uf] = NFCE_OWN_AUTHORIZERS.includes(uf) ? uf : 'SVRS';
  }
  return map;
}

const NFE_AUTHORIZERS = buildNFeAuthorizerMap();
const NFCE_AUTHORIZERS = buildNFCeAuthorizerMap();

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
  [DocumentType.NFe]: NFE_AUTHORIZERS,
  [DocumentType.NFCe]: NFCE_AUTHORIZERS,
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
