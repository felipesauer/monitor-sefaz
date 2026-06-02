// Domínio
export * from './domain/types.js';
export * from './domain/errors.js';

// Envelopes (Strategy por documento)
export type { EnvelopeBuilder, EnvelopeParams } from './envelopes/EnvelopeBuilder.js';
export {
  NFeStatusEnvelopeBuilder,
  NFCeStatusEnvelopeBuilder,
} from './envelopes/NFeStatusEnvelopeBuilder.js';

// Parsers
export type { ResponseParser, ParsedStatus } from './parsers/ResponseParser.js';
export { AbstractRetConsParser } from './parsers/AbstractRetConsParser.js';
export { NFeStatusParser, NFCeStatusParser } from './parsers/NFeStatusParser.js';

// Checker
export type { SoapClient, SoapResponse, SoapRequestOptions } from './checker/SoapClient.js';
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
