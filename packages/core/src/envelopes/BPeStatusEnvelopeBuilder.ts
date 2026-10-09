import { DocumentType } from '@monitor-sefaz/catalog';
import type { EnvelopeBuilder, EnvelopeParams } from './EnvelopeBuilder.js';

/**
 * Envelope SOAP 1.2 para `BPeStatusServico` (BP-e 1.00, operação
 * `bpeStatusServicoBP`). Namespace: http://www.portalfiscal.inf.br/bpe. Retorno:
 * retConsStatServBPe. Mesma mensagem do nfephp-org/sped-bpe (`sefazStatus`).
 */
export class BPeStatusEnvelopeBuilder implements EnvelopeBuilder {
  public readonly document: DocumentType = DocumentType.BPe;

  public build({ cUF, environment }: EnvelopeParams): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <bpeCabecMsg xmlns="http://www.portalfiscal.inf.br/bpe/wsdl/BPeStatusServico">
      <cUF>${cUF}</cUF>
      <versaoDados>1.00</versaoDados>
    </bpeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <bpeDadosMsg xmlns="http://www.portalfiscal.inf.br/bpe/wsdl/BPeStatusServico">
      <consStatServBPe versao="1.00" xmlns="http://www.portalfiscal.inf.br/bpe">
        <tpAmb>${environment}</tpAmb>
        <xServ>STATUS</xServ>
      </consStatServBPe>
    </bpeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
}
