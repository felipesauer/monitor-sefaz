// Reexporta os enums/tipos de domínio do catalog (conveniência para consumidores)
export { DocumentType, Environment } from '@monitor-sefaz/catalog';
export type { UF, AuthorizerCode } from '@monitor-sefaz/catalog';

// Domínio
export * from './domain/types.js';
export * from './domain/errors.js';

// Envelopes (Strategy por documento)
export type { EnvelopeBuilder, EnvelopeParams } from './envelopes/EnvelopeBuilder.js';
export {
  NFeStatusEnvelopeBuilder,
  NFCeStatusEnvelopeBuilder,
} from './envelopes/NFeStatusEnvelopeBuilder.js';
export { CTeStatusEnvelopeBuilder } from './envelopes/CTeStatusEnvelopeBuilder.js';
export { MDFeStatusEnvelopeBuilder } from './envelopes/MDFeStatusEnvelopeBuilder.js';
export { DCeStatusEnvelopeBuilder } from './envelopes/DCeStatusEnvelopeBuilder.js';

// Parsers
export type { ResponseParser, ParsedStatus } from './parsers/ResponseParser.js';
export { AbstractRetConsParser } from './parsers/AbstractRetConsParser.js';
export { NFeStatusParser, NFCeStatusParser } from './parsers/NFeStatusParser.js';
export {
  CTeStatusParser,
  MDFeStatusParser,
  DCeStatusParser,
} from './parsers/DocumentStatusParsers.js';

// Checker
export type {
  SoapClient,
  SoapResponse,
  SoapRequestOptions,
  ClientCertificate,
  AxiosSoapClientOptions,
} from './checker/SoapClient.js';
export { AxiosSoapClient } from './checker/SoapClient.js';
export { StatusClassifier } from './checker/StatusClassifier.js';
export { StatusChecker, type StatusCheckerOptions } from './checker/StatusChecker.js';
export { BatchChecker } from './checker/BatchChecker.js';

// Registry / Factory
export type { AuthorizerRegistry } from './registry/AuthorizerRegistry.js';
export { CatalogAuthorizerRegistry } from './registry/AuthorizerRegistry.js';
export { CheckerFactory, type CheckerFactoryDeps } from './registry/CheckerFactory.js';

// Relatório
export { StatusReport, type StatusSummary } from './report/StatusReport.js';

// Disponibilidade (scraping da página oficial — sem certificado A1)
export {
  AvailabilityParser,
  DOCUMENT_COLUMNS,
  type AvailabilityRow,
  type ColumnLayout,
} from './availability/AvailabilityParser.js';
export {
  HttpAvailabilityProvider,
  AVAILABILITY_URLS,
} from './availability/AvailabilityProvider.js';
export {
  AvailabilityCollector,
  type CollectedStatus,
  type StatusSource,
  type AvailabilityProviderLike,
} from './availability/AvailabilityCollector.js';

// Fonte IntegraNotas (API JSON pública) + collector híbrido
export {
  IntegraNotasProvider,
  INTEGRANOTAS_DOCUMENTS,
  mapIntegraNotasState,
  type IntegraNotasRow,
  type IntegraNotasFetcher,
} from './integranotas/IntegraNotasProvider.js';
export { IntegraNotasCollector } from './integranotas/IntegraNotasCollector.js';
export { createHttpIntegraNotasFetcher } from './integranotas/httpFetcher.js';
export { HybridCollector, type StatusCollectorLike } from './integranotas/HybridCollector.js';

// Fonte SVRS (portal oficial de disponibilidade — sem certificado A1)
export {
  SvrsParser,
  type SvrsAuthorizer,
  type SvrsWebService,
  type SvrsAuthorizerStatus,
} from './svrs/SvrsParser.js';
export { SvrsProvider, SVRS_URLS, type SvrsFetcher } from './svrs/SvrsProvider.js';
export { createHttpSvrsFetcher } from './svrs/httpFetcher.js';
export { SvrsCollector } from './svrs/SvrsCollector.js';
