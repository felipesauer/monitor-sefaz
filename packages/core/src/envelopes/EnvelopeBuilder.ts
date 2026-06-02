import type { DocumentType, Environment } from '@monitor-sefaz/catalog';

/** Parâmetros para montar o envelope de consulta de status. */
export interface EnvelopeParams {
  readonly cUF: number;
  /** Ambiente; o valor numérico do enum coincide com o `tpAmb` da SEFAZ. */
  readonly environment: Environment;
}

/**
 * Strategy que monta o envelope SOAP de "consulta status do serviço" para um
 * documento específico. Cada documento tem namespace, versão e nome de serviço
 * próprios, então cada um fornece uma implementação (Open/Closed).
 */
export interface EnvelopeBuilder {
  readonly document: DocumentType;
  build(params: EnvelopeParams): string;
}
