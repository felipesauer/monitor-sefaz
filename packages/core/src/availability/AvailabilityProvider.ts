import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { DocumentType } from '@monitor-sefaz/catalog';
import { backoffMs, defaultSleeper, type Sleeper } from '../domain/retry.js';
import { AvailabilityParser, type AvailabilityRow } from './AvailabilityParser.js';

// Reexporta o backoff/Sleeper compartilhado para não quebrar importações antigas
// que apontam para este módulo (ex.: SvrsProvider e os testes).
export { backoffMs, type Sleeper };

/**
 * URLs das páginas oficiais de disponibilidade de PRODUÇÃO, por documento, em
 * ordem de preferência. Cada documento aceita uma ou mais URLs; o provider
 * tenta a próxima quando a anterior falha ou não traz dados.
 *
 * IMPORTANTE: só entram aqui fontes de **produção**. Os portais `hom.` mostram
 * a disponibilidade do ambiente de HOMOLOGAÇÃO — status independente do de
 * produção — e por isso NÃO servem como fallback (reportariam o ambiente errado).
 * Quando a fonte de produção falha (ex.: `erro.aspx` intermitente da SEFAZ), o
 * documento fica ausente do snapshot e o front o exibe como "Sem dados".
 */
export const AVAILABILITY_URLS: Partial<Record<DocumentType, readonly string[]>> = {
  [DocumentType.NFe]: ['https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx'],
  [DocumentType.NFCe]: ['https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx'],
  [DocumentType.CTe]: ['https://www.cte.fazenda.gov.br/portal/disponibilidade.aspx'],
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
    private readonly timeoutMs = 20_000,
    private readonly sleep: Sleeper = defaultSleeper,
    /** Fonte de aleatoriedade do jitter; injetável para o backoff ser determinístico em teste. */
    private readonly random: () => number = Math.random
  ) {
    const jar = new CookieJar();
    this.http = wrapper(
      axios.create({
        jar,
        timeout: this.timeoutMs,
        // O portal usa AspxAutoDetectCookieSupport e pode encadear vários
        // redirects até fixar o cookie de sessão; damos folga suficiente.
        maxRedirects: 15,
        responseType: 'arraybuffer', // a página é latin-1; decodificamos manualmente
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        validateStatus: () => true,
      })
    );
  }

  /** Lista os documentos cobertos por este provider. */
  public supportedDocuments(): DocumentType[] {
    return Object.keys(AVAILABILITY_URLS) as DocumentType[];
  }

  /**
   * Busca e parseia a tabela de disponibilidade de um documento. Tenta cada URL
   * de produção em sequência; dentro de cada uma, repete algumas vezes — a SEFAZ
   * ocasionalmente devolve `erro.aspx` (página sem a tabela) ou recusa a conexão
   * de forma intermitente, e o retry evita que um documento "suma" por uma falha
   * momentânea. Se todas as tentativas falharem, lança (o coletor então omite o
   * documento, que o front mostra como "Sem dados").
   */
  public async fetch(document: DocumentType, attemptsPerUrl = 3): Promise<AvailabilityRow[]> {
    const urls = AVAILABILITY_URLS[document];
    if (!urls || urls.length === 0) {
      return [];
    }

    // Cada documento tem layout de colunas próprio (NF-e usa índice 5, CT-e usa 2).
    const parser = new AvailabilityParser(document);
    let lastError: unknown;
    const totalAttempts = urls.length * attemptsPerUrl;
    let attemptIndex = 0;
    for (const url of urls) {
      for (let attempt = 1; attempt <= attemptsPerUrl; attempt += 1) {
        attemptIndex += 1;
        try {
          const response = await this.http.get<ArrayBuffer>(url);
          const html = Buffer.from(response.data).toString('latin1');
          const { rows, headerMatched } = parser.parseWithDiagnostics(html);
          // Só confiamos nas linhas se o layout foi VALIDADO pelo cabeçalho. Se o
          // cabeçalho não casou (headerMatched=false), o HTML pode ter mudado e as
          // linhas viriam de colunas erradas — tratamos como falha de parse, que
          // esvazia esta fonte e a marca `degraded` no consenso (sinal de drift),
          // em vez de publicar dado possivelmente incorreto em silêncio.
          if (rows.length > 0 && headerMatched) {
            return rows;
          }
          lastError = new Error(
            headerMatched
              ? `resposta sem linhas de status (HTTP ${response.status})`
              : `layout inesperado: cabeçalho não reconhecido (HTTP ${response.status})`
          );
        } catch (err) {
          lastError = err;
        }
        // Backoff antes da PRÓXIMA tentativa (nunca após a última): dá tempo de
        // uma falha transitória passar e não martela a SEFAZ em milissegundos,
        // o que agravaria o rate-limit. Linear (500ms × n) com jitter ±20%.
        if (attemptIndex < totalAttempts) {
          await this.sleep(backoffMs(attempt, this.random));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
