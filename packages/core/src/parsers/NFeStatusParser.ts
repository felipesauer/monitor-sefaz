import { DocumentType } from '@monitor-sefaz/catalog';
import { AbstractRetConsParser } from './AbstractRetConsParser.js';

/** Parser da resposta de status NF-e (`retConsStatServ`). */
export class NFeStatusParser extends AbstractRetConsParser {
  public readonly document = DocumentType.NFe;
  protected readonly retNodeName = 'retConsStatServ';
}

/** NFC-e usa o mesmo nó de retorno da NF-e. */
export class NFCeStatusParser extends AbstractRetConsParser {
  public readonly document = DocumentType.NFCe;
  protected readonly retNodeName = 'retConsStatServ';
}
