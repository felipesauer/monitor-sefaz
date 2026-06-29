import { DocumentType } from '@monitor-sefaz/catalog';
import { backoffMs, type Sleeper } from '../availability/AvailabilityProvider.js';
import { SvrsParser, type SvrsAuthorizerStatus } from './SvrsParser.js';

/**
 * URLs de PRODUÇÃO do portal de disponibilidade do SVRS, por documento. NF-e e
 * NFC-e compartilham a página da NF-e; DC-e roda no SVRS e usa a página da MDF-e
 * como melhor proxy oficial disponível (ambos são serviços do SVRS nacional).
 *
 * Diferente do `hom.` da Receita, o SVRS não separa o portal por ambiente aqui —
 * estas páginas refletem a disponibilidade de produção.
 */
export const SVRS_URLS: Partial<Record<DocumentType, string>> = {
  [DocumentType.NFe]: 'https://dfe-portal.svrs.rs.gov.br/Nfe/Disponibilidade',
  [DocumentType.NFCe]: 'https://dfe-portal.svrs.rs.gov.br/Nfe/Disponibilidade',
  [DocumentType.CTe]: 'https://dfe-portal.svrs.rs.gov.br/Cte/Disponibilidade',
  [DocumentType.MDFe]: 'https://dfe-portal.svrs.rs.gov.br/Mdfe/Disponibilidade',
  [DocumentType.DCe]: 'https://dfe-portal.svrs.rs.gov.br/Mdfe/Disponibilidade',
};

const defaultSleeper: Sleeper = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Transporte HTTP injetável (axios no Node via `createHttpSvrsFetcher`, fetch
 * nativo no Worker). Devolve o HTML já decodificado. É injetado — e não default —
 * de propósito: assim o bundle do Worker NÃO arrasta axios/tough-cookie (APIs de
 * Node), mesmo importação do `SvrsProvider`.
 */
export interface SvrsFetcher {
  (url: string): Promise<string>;
}

/**
 * Cliente da página pública de disponibilidade do SVRS — fonte OFICIAL que NÃO
 * exige certificado A1. O transporte é injetado; o provider só cuida do retry com
 * backoff (o portal é ASP.NET e ocasionalmente recusa a conexão) e do parse.
 */
export class SvrsProvider {
  private readonly parser = new SvrsParser();

  constructor(
    private readonly fetcher: SvrsFetcher,
    private readonly sleep: Sleeper = defaultSleeper,
    private readonly random: () => number = Math.random
  ) {}

  /** Documentos que o SVRS cobre (todos os 5, via autorizador SVRS/SEFAZ-RS). */
  public supportedDocuments(): DocumentType[] {
    return Object.keys(SVRS_URLS) as DocumentType[];
  }

  /**
   * Busca e parseia a disponibilidade de um documento. Tenta algumas vezes com
   * backoff; se todas falharem ou não trouxerem autorizadores, LANÇA — assim o
   * `SvrsCollector` omite o documento e o consenso cai na próxima fonte (parse
   * estrito, como nas demais fontes ao vivo).
   */
  public async fetch(document: DocumentType, attempts = 3): Promise<SvrsAuthorizerStatus[]> {
    const url = SVRS_URLS[document];
    if (!url) {
      return [];
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const html = await this.fetcher(url);
        const rows = this.parser.parse(html);
        if (rows.length > 0) {
          return rows;
        }
        lastError = new Error('SVRS: resposta sem autorizadores');
      } catch (err) {
        lastError = err;
      }
      if (attempt < attempts) {
        await this.sleep(backoffMs(attempt, this.random));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
