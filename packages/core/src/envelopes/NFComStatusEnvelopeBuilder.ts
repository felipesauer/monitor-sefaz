import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para `NFComStatusServico` (NFCom 1.00, operação
 * `nfcomStatusServicoNF`). Namespace: http://www.portalfiscal.inf.br/nfcom.
 * Retorno: retConsStatServNFCom.
 *
 * Diferente da NF-e e do BP-e, o WSDL da NFCom não tem cabeçalho (`nfcomCabecMsg`):
 * a mensagem vai só no corpo. O `consStatServNFCom` segue o schema oficial
 * (PL_NFCOM_1.00, `TConsStatServ`), que tem só `tpAmb` e `xServ`. O
 * nfephp-org/sped-nfcom manda também um `cUF`, fora do schema; sem certificado
 * para testar contra o autorizador, ficamos com o schema.
 */
export class NFComStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.NFCom;

  public build({ environment }: EnvelopeParams): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfcomDadosMsg xmlns="http://www.portalfiscal.inf.br/nfcom/wsdl/NFComStatusServico">
      <consStatServNFCom versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfcom">
        <tpAmb>${environment}</tpAmb>
        <xServ>STATUS</xServ>
      </consStatServNFCom>
    </nfcomDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
