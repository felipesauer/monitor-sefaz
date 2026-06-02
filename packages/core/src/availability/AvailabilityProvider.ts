import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { DocumentType } from '@monitor-sefaz/catalog';
import { AvailabilityParser, type AvailabilityRow } from './AvailabilityParser.js';

/** URLs das páginas oficiais de disponibilidade por documento. */
export const AVAILABILITY_URLS: Partial<Record<DocumentType, string>> = {
  [DocumentType.NFe]: 'https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx',
  [DocumentType.NFCe]: 'https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx',
  [DocumentType.CTe]: 'https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx',
};

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Obtém o status dos autorizadores a partir da página oficial de
 * disponibilidade da SEFAZ — fonte pública que NÃO exige certificado A1.
 *
 * A página usa o esquema ASP.NET `AspxAutoDetectCookieSupport`, que entra em
 * loop de redirect sem cookies; por isso usamos um cookie jar e um User-Agent
 * de browser. Esta é a mesma estratégia de monitores públicos da SEFAZ.
 */
export class HttpAvailabilityProvider {
  private readonly http: AxiosInstance;

  constructor(
    private readonly parser = new AvailabilityParser(),
    private readonly timeoutMs = 20_000
  ) {
    const jar = new CookieJar();
    this.http = wrapper(
      axios.create({
        jar,
        timeout: this.timeoutMs,
        maxRedirects: 5,
        responseType: 'arraybuffer', // a página é latin-1; decodificamos manualmente
        headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
        validateStatus: () => true,
      })
    );
  }

  /** Lista os documentos cobertos por este provider. */
  public supportedDocuments(): DocumentType[] {
    return Object.keys(AVAILABILITY_URLS) as DocumentType[];
  }

  /** Busca e parseia a tabela de disponibilidade de um documento. */
  public async fetch(document: DocumentType): Promise<AvailabilityRow[]> {
    const url = AVAILABILITY_URLS[document];
    if (!url) {
      return [];
    }
    const response = await this.http.get<ArrayBuffer>(url);
    const html = Buffer.from(response.data).toString('latin1');
    return this.parser.parse(html);
  }
}
