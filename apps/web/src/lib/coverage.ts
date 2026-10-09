import { ALL_UFS, DocumentType, type UF } from '@monitor-sefaz/catalog';
import { DOCUMENTS } from './ufFacts.js';

/** O mínimo que o cálculo de cobertura precisa de um serviço do snapshot. */
interface Covered {
  document: string;
  uf: string;
}

/**
 * Documentos que o snapshot não traz para a UF — os que nenhuma fonte pública
 * cobre ali (ex.: o BP-e de SP, que só existe no modo `soap`, com certificado).
 * Sai dos dados, não de uma lista fixa: uma lacuna nova aparece sozinha.
 */
export function documentsWithoutStatus(
  services: readonly Covered[],
  uf: UF
): ReadonlySet<DocumentType> {
  const covered = new Set(services.filter((s) => s.uf === uf).map((s) => s.document));
  return new Set(DOCUMENTS.filter((document) => !covered.has(document)));
}

/** UFs que o snapshot não traz para o documento, na ordem do catálogo. */
export function ufsWithoutStatus(services: readonly Covered[], document: DocumentType): UF[] {
  const covered = new Set(services.filter((s) => s.document === document).map((s) => s.uf));
  return ALL_UFS.filter((uf) => !covered.has(uf));
}
