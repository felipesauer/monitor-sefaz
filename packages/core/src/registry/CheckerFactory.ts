import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder } from '../envelopes/EnvelopeBuilder.js';
import {
  NFCeStatusEnvelopeBuilder,
  NFeStatusEnvelopeBuilder,
} from '../envelopes/NFeStatusEnvelopeBuilder.js';
import { CTeStatusEnvelopeBuilder } from '../envelopes/CTeStatusEnvelopeBuilder.js';
import { MDFeStatusEnvelopeBuilder } from '../envelopes/MDFeStatusEnvelopeBuilder.js';
import { DCeStatusEnvelopeBuilder } from '../envelopes/DCeStatusEnvelopeBuilder.js';
import type { ResponseParser } from '../parsers/ResponseParser.js';
import { NFCeStatusParser, NFeStatusParser } from '../parsers/NFeStatusParser.js';
import {
  CTeStatusParser,
  DCeStatusParser,
  MDFeStatusParser,
} from '../parsers/DocumentStatusParsers.js';
import { AxiosSoapClient, type SoapClient } from '../checker/SoapClient.js';
import { StatusClassifier } from '../checker/StatusClassifier.js';
import { StatusChecker, type StatusCheckerOptions } from '../checker/StatusChecker.js';

export interface CheckerFactoryDeps {
  /** Cliente SOAP; padrão `AxiosSoapClient`. Injetável para testes. */
  readonly client?: SoapClient;
  readonly options?: StatusCheckerOptions;
}

/**
 * Monta um `StatusChecker` com todos os builders/parsers registrados.
 * Adicionar um documento novo significa registrar aqui o par builder+parser —
 * nenhuma outra parte do core muda (Open/Closed).
 */
export class CheckerFactory {
  public static buildersByDocument(): Map<DocumentType, EnvelopeBuilder> {
    const builders: EnvelopeBuilder[] = [
      new NFeStatusEnvelopeBuilder(),
      new NFCeStatusEnvelopeBuilder(),
      new CTeStatusEnvelopeBuilder(),
      new MDFeStatusEnvelopeBuilder(),
      new DCeStatusEnvelopeBuilder(),
    ];
    return new Map(builders.map((b) => [b.document, b]));
  }

  public static parsersByDocument(): Map<DocumentType, ResponseParser> {
    const parsers: ResponseParser[] = [
      new NFeStatusParser(),
      new NFCeStatusParser(),
      new CTeStatusParser(),
      new MDFeStatusParser(),
      new DCeStatusParser(),
    ];
    return new Map(parsers.map((p) => [p.document, p]));
  }

  public static create(deps: CheckerFactoryDeps = {}): StatusChecker {
    const client = deps.client ?? new AxiosSoapClient();
    return new StatusChecker(
      CheckerFactory.buildersByDocument(),
      CheckerFactory.parsersByDocument(),
      client,
      new StatusClassifier(),
      deps.options
    );
  }
}
