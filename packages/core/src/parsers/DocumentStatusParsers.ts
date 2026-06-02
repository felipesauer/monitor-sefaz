import { DocumentType } from '@monitor-sefaz/catalog';
import { AbstractRetConsParser } from './AbstractRetConsParser.js';

/** Parser da resposta de status CT-e (`retConsStatServCte`). */
export class CTeStatusParser extends AbstractRetConsParser {
  public readonly document = DocumentType.CTe;
  protected readonly retNodeName = 'retConsStatServCte';
}

/** Parser da resposta de status MDF-e (`retConsStatServMDFe`). */
export class MDFeStatusParser extends AbstractRetConsParser {
  public readonly document = DocumentType.MDFe;
  protected readonly retNodeName = 'retConsStatServMDFe';
}

/** Parser da resposta de status DC-e (`retConsStatServ`, padrão NF-e). */
export class DCeStatusParser extends AbstractRetConsParser {
  public readonly document = DocumentType.DCe;
  protected readonly retNodeName = 'retConsStatServ';
}
