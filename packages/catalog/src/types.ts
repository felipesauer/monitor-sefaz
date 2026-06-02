/**
 * Tipos fundamentais do domínio SEFAZ DFe.
 *
 * Ficam no `catalog` (pacote de dados, sem dependências) para que tanto o
 * `core` (comportamento) quanto os dados estáticos possam referenciá-los sem
 * criar dependência circular.
 */

/** Tipo de documento fiscal eletrônico monitorado. */
export enum DocumentType {
  NFe = 'NFe',
  NFCe = 'NFCe',
  CTe = 'CTe',
  MDFe = 'MDFe',
  DCe = 'DCe',
}

/** Ambiente de operação. O valor numérico coincide com o `tpAmb` da SEFAZ. */
export enum Environment {
  Production = 1,
  Homologation = 2,
}

/** Siglas das 27 unidades federativas brasileiras. */
export type UF =
  | 'AC'
  | 'AL'
  | 'AP'
  | 'AM'
  | 'BA'
  | 'CE'
  | 'DF'
  | 'ES'
  | 'GO'
  | 'MA'
  | 'MG'
  | 'MS'
  | 'MT'
  | 'PA'
  | 'PB'
  | 'PE'
  | 'PI'
  | 'PR'
  | 'RJ'
  | 'RN'
  | 'RO'
  | 'RR'
  | 'RS'
  | 'SC'
  | 'SE'
  | 'SP'
  | 'TO';

/**
 * Autorizador que efetivamente responde pela consulta.
 * Pode ser a própria UF (autorizador estadual) ou um ambiente virtual/nacional.
 */
export type AuthorizerCode =
  | UF
  | 'SVRS' // Sefaz Virtual do Rio Grande do Sul
  | 'SVAN' // Sefaz Virtual do Ambiente Nacional
  | 'AN' // Ambiente Nacional
  | 'SVCAN' // Sefaz Virtual de Contingência — Ambiente Nacional
  | 'SVCRS'; // Sefaz Virtual de Contingência — Rio Grande do Sul

/** Chave de ambiente em formato textual usada em configs/URLs. */
export type EnvironmentKey = 'production' | 'homologation';

/** Metadados de uma UF: código IBGE e nome por extenso. */
export interface UFInfo {
  readonly cUF: number;
  readonly nome: string;
}
