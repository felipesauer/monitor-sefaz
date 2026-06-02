import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para `NFeStatusServico4` (NF-e 4.00).
 * Ref: NT 2014.002 — consStatServ. NFC-e usa o mesmo serviço.
 */
export class NFeStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.NFe;

  public build({ cUF, environment }: EnvelopeParams): string {
    const tpAmb = environment;
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <cUF>${cUF}</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <consStatServ versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <tpAmb>${tpAmb}</tpAmb>
        <cUF>${cUF}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}

/**
 * NFC-e compartilha o webservice e o envelope da NF-e na consulta de status.
 * Mantemos uma classe própria para permitir divergências futuras (OCP).
 */
export class NFCeStatusEnvelopeBuilder extends NFeStatusEnvelopeBuilder {
  public override readonly document = DocumentType.NFCe;
}
