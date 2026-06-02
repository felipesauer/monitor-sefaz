import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para `MDFeStatusServico` (MDF-e 3.00).
 * Namespace: http://www.portalfiscal.inf.br/mdfe. Retorno: retConsStatServMDFe.
 * O MDF-e não envia `cUF` no corpo da consulta de status.
 */
export class MDFeStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.MDFe;

  public build({ cUF, environment }: EnvelopeParams): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <mdfeCabecMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeStatusServico">
      <cUF>${cUF}</cUF>
      <versaoDados>3.00</versaoDados>
    </mdfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <mdfeDadosMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeStatusServico">
      <consStatServMDFe versao="3.00" xmlns="http://www.portalfiscal.inf.br/mdfe">
        <tpAmb>${environment}</tpAmb>
        <xServ>STATUS</xServ>
      </consStatServMDFe>
    </mdfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
