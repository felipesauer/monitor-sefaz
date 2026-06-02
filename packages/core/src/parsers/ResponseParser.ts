import type { DocumentType } from '@monitor-sefaz/catalog';

/** Dados relevantes extraídos da resposta de consulta de status. */
export interface ParsedStatus {
  readonly cStat: number;
  readonly xMotivo: string;
  readonly dhRecbto: string | null;
  readonly tMed: number | null;
}

/**
 * Extrai o status de uma resposta SOAP da SEFAZ. Implementações lançam erros
 * tipados (HtmlResponseError, SoapFaultError, InvalidXmlError,
 * MissingStatusNodeError) em vez de retornar valores inválidos.
 */
export interface ResponseParser {
  readonly document: DocumentType;
  parse(xml: string): ParsedStatus;
}
