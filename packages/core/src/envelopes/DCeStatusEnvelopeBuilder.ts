import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para a consulta de status da DC-e (Declaração de Conteúdo
 * eletrônica). Namespace: http://www.portalfiscal.inf.br/dce. Retorno:
 * retConsStatServ (segue o padrão da NF-e). DC-e é centralizada no SVRS.
 */
export class DCeStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.DCe;

  public build({ cUF, environment }: EnvelopeParams): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <dceCabecMsg xmlns="http://www.portalfiscal.inf.br/dce/wsdl/DCeStatusServico">
      <cUF>${cUF}</cUF>
      <versaoDados>1.00</versaoDados>
    </dceCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <dceDadosMsg xmlns="http://www.portalfiscal.inf.br/dce/wsdl/DCeStatusServico">
      <consStatServ versao="1.00" xmlns="http://www.portalfiscal.inf.br/dce">
        <tpAmb>${environment}</tpAmb>
        <cUF>${cUF}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </dceDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
