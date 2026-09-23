import {
  ALL_UFS,
  Catalog,
  DocumentType,
  REGIONS,
  UF_INFO,
  type AuthorizerCode,
  type Region,
  type UF,
} from '@monitor-sefaz/catalog';

/** O que as páginas por UF dizem sobre cada estado, derivado do catalog. */

const catalog = new Catalog();

/** Os cinco documentos, na ordem em que o site os apresenta. */
export const DOCUMENTS: readonly DocumentType[] = [
  DocumentType.NFe,
  DocumentType.NFCe,
  DocumentType.CTe,
  DocumentType.MDFe,
  DocumentType.DCe,
];

export interface UfAuthorization {
  document: DocumentType;
  authorizer: AuthorizerCode;
  /** A própria SEFAZ da UF autoriza (autorizador estadual). */
  own: boolean;
}

/** Quem autoriza cada documento na UF. */
export function ufAuthorizations(uf: UF): UfAuthorization[] {
  return DOCUMENTS.map((document) => {
    const authorizer = catalog.resolveAuthorizer(document, uf);
    return { document, authorizer, own: authorizer === uf };
  });
}

const byName = (a: UF, b: UF): number => UF_INFO[a].nome.localeCompare(UF_INFO[b].nome, 'pt-BR');

/**
 * As outras UFs que o mesmo autorizador atende no documento — as que caem
 * junto quando ele cai.
 */
export function ufsSharingAuthorizer(document: DocumentType, uf: UF): UF[] {
  const authorizer = catalog.resolveAuthorizer(document, uf);
  return ALL_UFS.filter(
    (other) => other !== uf && catalog.resolveAuthorizer(document, other) === authorizer
  ).sort(byName);
}

/** O SVC para onde vai a NF-e da UF quando a contingência é ativada. */
export function nfeContingency(uf: UF): AuthorizerCode | null {
  return catalog.resolveContingency(DocumentType.NFe, uf);
}

/** As UFs de cada região, na ordem do IBGE e em ordem alfabética dentro dela. */
export const UFS_BY_REGION: readonly { region: Region; ufs: readonly UF[] }[] = REGIONS.map(
  (region) => ({
    region,
    ufs: ALL_UFS.filter((uf) => UF_INFO[uf].regiao === region).sort(byName),
  })
);
