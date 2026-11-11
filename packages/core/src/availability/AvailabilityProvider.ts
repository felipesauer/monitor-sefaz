import type { AxiosInstance } from 'axios';
import { DocumentType } from '@monitor-sefaz/catalog';
import { backoffMs, defaultSleeper, type Sleeper } from '../domain/retry.js';
import { AvailabilityParser, type AvailabilityRow } from './AvailabilityParser.js';
import { createPortalClient, warmUpConnection } from '../http/portalClient.js';

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

/**
 * Páginas de disponibilidade de HOMOLOGAÇÃO da Receita. Status independente do de
 * produção (por isso nunca são fallback dela); servem só à camada de detalhe, que
 * mostra os dois ambientes lado a lado. Só NF-e e CT-e têm página pública.
 */
export const HOMOLOGATION_AVAILABILITY_URLS: Partial<Record<DocumentType, string>> = {
  [DocumentType.NFe]: 'https://hom.nfe.fazenda.gov.br/portal/disponibilidade.aspx',
  [DocumentType.CTe]: 'https://hom.cte.fazenda.gov.br/portal/disponibilidade.aspx',
};

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
    private readonly random: () => number = Math.random,
    /**
     * Avisado com cada página válida baixada. A camada de detalhe usa isto para
     * ler as mesmas páginas da rodada sem baixá-las de novo.
     */
    private readonly onPage?: (url: string, html: string) => void
  ) {
    this.http = createPortalClient(this.timeoutMs);
  }

  /**
   * Abre a conexão com a página do documento antes da busca medida (ADR-23):
   * assim a latência registrada é a resposta da fonte, não a abertura da
   * conexão a partir do runner.
   */
  public async warmUp(document: DocumentType): Promise<void> {
    const url = AVAILABILITY_URLS[document]?.[0];
    if (url) await warmUpConnection(this.http, url);
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
            this.onPage?.(url, html);
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

  /**
   * Baixa uma página de disponibilidade qualquer (a de homologação, por exemplo)
   * com o mesmo retry e a mesma validação de cabeçalho do `fetch`, e devolve o
   * HTML. Lança se nenhuma tentativa trouxer a tabela.
   */
  public async fetchPage(url: string, document: DocumentType, attempts = 3): Promise<string> {
    const parser = new AvailabilityParser(document);
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.http.get<ArrayBuffer>(url);
        const html = Buffer.from(response.data).toString('latin1');
        const { rows, headerMatched } = parser.parseWithDiagnostics(html);
        if (rows.length > 0 && headerMatched) {
          return html;
        }
        lastError = new Error(`página sem tabela de status (HTTP ${response.status})`);
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
