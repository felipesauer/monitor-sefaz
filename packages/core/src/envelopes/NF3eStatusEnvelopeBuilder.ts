import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para `NF3eStatusServico` (NF3e 1.00, operação
 * `nf3eStatusServicoNF`). Namespace: http://www.portalfiscal.inf.br/nf3e.
 * Retorno: retConsStatServNF3e.
 *
 * Como na NFCom, a mensagem vai só no corpo (`nf3eDadosMsg`, conforme o MOC), e o
 * `consStatServNF3e` segue o schema oficial (`TConsStatServ`: só `tpAmb` e
 * `xServ`). Bibliotecas como o Uninfe mandam também um `cUF`, fora do schema; sem
 * certificado para testar contra o autorizador, ficamos com o schema.
 */
export class NF3eStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.NF3e;

  public build({ environment }: EnvelopeParams): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nf3eDadosMsg xmlns="http://www.portalfiscal.inf.br/nf3e/wsdl/NF3eStatusServico">
      <consStatServNF3e versao="1.00" xmlns="http://www.portalfiscal.inf.br/nf3e">
        <tpAmb>${environment}</tpAmb>
        <xServ>STATUS</xServ>
      </consStatServNF3e>
    </nf3eDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
