import { ALL_UFS, UF_INFO, type UF } from '@monitor-sefaz/catalog';

/** Rótulos amigáveis de UF e documento para a interface. */

/** Nome por extenso de cada UF, lido do catalog (a fonte dos dados de UF). */
export const UF_NAME: Record<string, string> = Object.fromEntries(
  ALL_UFS.map((uf) => [uf, UF_INFO[uf].nome])
);

/**
 * Artigo que o nome de cada UF pede ("o Acre", "a Bahia", "São Paulo"), para
 * as frases das páginas por estado saírem naturais: "do Acre", "na Bahia",
 * "em São Paulo". Segue a forma oficial ("Governo de Mato Grosso").
 */
const UF_ARTICLE: Record<UF, '' | 'o' | 'a'> = {
  AC: 'o',
  AL: '',
  AP: 'o',
  AM: 'o',
  BA: 'a',
  CE: 'o',
  DF: 'o',
  ES: 'o',
  GO: '',
  MA: 'o',
  MG: '',
  MS: '',
  MT: '',
  PA: 'o',
  PB: 'a',
  PE: '',
  PI: 'o',
  PR: 'o',
  RJ: 'o',
  RN: 'o',
  RO: '',
  RR: '',
  RS: 'o',
  SC: '',
  SE: '',
  SP: '',
  TO: 'o',
};

const OF = { '': 'de', o: 'do', a: 'da' } as const;
const IN = { '': 'em', o: 'no', a: 'na' } as const;

/** "de São Paulo", "do Acre", "da Bahia". */
export function ofUf(uf: UF): string {
  return `${OF[UF_ARTICLE[uf]]} ${UF_INFO[uf].nome}`;
}

/** "em São Paulo", "no Acre", "na Bahia". */
export function inUf(uf: UF): string {
  return `${IN[UF_ARTICLE[uf]]} ${UF_INFO[uf].nome}`;
}

/** Nome por extenso dos autorizadores que não são a SEFAZ de uma UF. */
export const AUTHORIZER_NAME: Record<string, string> = {
  SVRS: 'Sefaz Virtual do Rio Grande do Sul',
  SVAN: 'Sefaz Virtual do Ambiente Nacional',
  AN: 'Ambiente Nacional',
  SVCAN: 'Sefaz Virtual de Contingência do Ambiente Nacional',
  SVCRS: 'Sefaz Virtual de Contingência do Rio Grande do Sul',
};

/** Sigla de exibição do autorizador: "SVC-AN" para SVCAN, "SEFAZ-SP" para SP. */
export function authorizerLabel(code: string): string {
  if (code === 'SVCAN') return 'SVC-AN';
  if (code === 'SVCRS') return 'SVC-RS';
  return code in AUTHORIZER_NAME ? code : `SEFAZ-${code}`;
}

/** Rótulo de exibição de cada documento (com hífen, como o público espera). */
export const DOC_LABEL: Record<string, string> = {
  NFe: 'NF-e',
  NFCe: 'NFC-e',
  CTe: 'CT-e',
  MDFe: 'MDF-e',
  DCe: 'DC-e',
};

/** Descrição curta de cada documento, para tooltips e o painel de detalhe. */
export const DOC_DESCRIPTION: Record<string, string> = {
  NFe: 'Nota Fiscal Eletrônica — documento que registra a circulação de mercadorias entre empresas (modelo 55).',
  NFCe: 'Nota Fiscal de Consumidor Eletrônica — emitida na venda ao consumidor final no varejo (modelo 65).',
  CTe: 'Conhecimento de Transporte Eletrônico — documenta a prestação de serviço de transporte de cargas.',
  MDFe: 'Manifesto Eletrônico de Documentos Fiscais — agrupa as notas/CT-e de uma carga em trânsito.',
  DCe: 'Declaração de Conteúdo eletrônica — usada no transporte de bens entre não contribuintes.',
};

/**
 * Formata latência em ms para exibição (ex: 1500 → "1.5 s", 240 → "240 ms").
 *
 * `0` é uma medição LEGÍTIMA — o "tempo médio" da SEFAZ vem em segundos inteiros
 * e 0 significa resposta sub-segundo (rápida), não "sem dado". Só valores não
 * numéricos ou negativos (ausência de medição) viram "—". Tratar 0 como "—"
 * fazia a maioria dos cards saudáveis (tMed=0) exibir traço de indisponível.
 */
export function formatLatency(ms: number): { value: string; unit: string } {
  if (!Number.isFinite(ms) || ms < 0) return { value: '—', unit: '' };
  if (ms === 0) return { value: '<1', unit: 's' };
  if (ms >= 1000) return { value: (ms / 1000).toFixed(1), unit: 's' };
  return { value: String(ms), unit: 'ms' };
}
