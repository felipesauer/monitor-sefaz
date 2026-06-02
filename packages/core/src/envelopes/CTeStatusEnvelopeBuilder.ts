import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para `CTeStatusServico` (CT-e 4.00).
 * Namespace: http://www.portalfiscal.inf.br/cte. Retorno: retConsStatServCte.
 */
export class CTeStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.CTe;

  public build({ cUF, environment }: EnvelopeParams): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <cteCabecMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeStatusServicoV4">
      <cUF>${cUF}</cUF>
      <versaoDados>4.00</versaoDados>
    </cteCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeStatusServicoV4">
      <consStatServCte versao="4.00" xmlns="http://www.portalfiscal.inf.br/cte">
        <tpAmb>${environment}</tpAmb>
        <xServ>STATUS</xServ>
      </consStatServCte>
    </cteDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
