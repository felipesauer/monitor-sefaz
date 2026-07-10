import {
  AvailabilityParser,
  AVAILABILITY_URLS,
  backoffMs,
  defaultSleeper,
  type AvailabilityRow,
  type Sleeper,
} from '@monitor-sefaz/core';
import { DocumentType } from '@monitor-sefaz/catalog';

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Provider de disponibilidade para o runtime Cloudflare Workers, usando o
 * `fetch` nativo (sem axios/tough-cookie, que dependem de APIs de Node).
 *
 * Resolve o ciclo `AspxAutoDetectCookieSupport` manualmente: a 1ª resposta é um
 * 302 com `Set-Cookie`; reenviamos com o cookie para obter a página final. O
 * parsing do HTML reaproveita o `AvailabilityParser` do core (baseado em cheerio,
 * que funciona em Workers).
 */
export class WorkerAvailabilityProvider {
  constructor(
    /** Sleeper do backoff entre tentativas; injetável para os testes não dormirem. */
    private readonly sleep: Sleeper = defaultSleeper,
    /** Fonte de aleatoriedade do jitter; injetável para o backoff ser determinístico. */
    private readonly random: () => number = Math.random
  ) {}

  public supportedDocuments(): DocumentType[] {
    return Object.keys(AVAILABILITY_URLS) as DocumentType[];
  }

  public async fetch(document: DocumentType, attemptsPerUrl = 3): Promise<AvailabilityRow[]> {
    const urls = AVAILABILITY_URLS[document];
    if (!urls || urls.length === 0) {
      return [];
    }
    // Cada documento tem layout de colunas próprio (NF-e=5, CT-e=2).
    const parser = new AvailabilityParser(document);
    // Tenta cada URL de produção, com retries — a SEFAZ devolve `erro.aspx`
    // (página sem a tabela) de forma intermitente. NÃO há fallback de
    // homologação: o ambiente é distinto e reportaria status errado.
    let lastError: unknown;
    const totalAttempts = urls.length * attemptsPerUrl;
    let attemptIndex = 0;
    for (const url of urls) {
      for (let attempt = 1; attempt <= attemptsPerUrl; attempt += 1) {
        attemptIndex += 1;
        try {
          const { rows, headerMatched } = await this.fetchOne(url, parser);
          // Paridade com o Node: só confia nas linhas se o cabeçalho validou o
          // layout. Sem isso, esvazia a fonte (→ degraded no consenso) em vez de
          // publicar leitura de colunas possivelmente erradas.
          if (rows.length > 0 && headerMatched) {
            return rows;
          }
          lastError = new Error(
            headerMatched ? 'resposta sem linhas de status' : 'layout inesperado: cabeçalho não reconhecido'
          );
        } catch (err) {
          lastError = err;
        }
        // Backoff antes da PRÓXIMA tentativa (paridade com o caminho Node): dá
        // tempo de uma falha transitória passar e não martela a SEFAZ.
        if (attemptIndex < totalAttempts) {
          await this.sleep(backoffMs(attempt, this.random));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async fetchOne(
    url: string,
    parser: AvailabilityParser
  ): Promise<{ rows: AvailabilityRow[]; headerMatched: boolean }> {
    const headers: Record<string, string> = {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    };

    // 1ª requisição: pode vir 302 setando o cookie de detecção (ASP.NET).
    let response = await fetch(url, { headers, redirect: 'manual' });

    if (response.status === 301 || response.status === 302) {
      const cookie = this.extractCookies(response.headers);
      if (cookie) {
        // Reenvia para a URL ORIGINAL (limpa) com o cookie. NÃO seguir o
        // `location` (que traz `?AspxAutoDetectCookieSupport=1` e devolve uma
        // página intermediária sem a tabela). Com cookie + URL limpa, o ASP.NET
        // serve a página real.
        response = await fetch(url, { headers: { ...headers, Cookie: cookie } });
      } else {
        const location = response.headers.get('location') ?? url;
        response = await fetch(new URL(location, url).toString(), { headers });
      }
    }

    // A página é latin-1; o Worker não tem Buffer. Decodificamos via TextDecoder
    // (paridade com o caminho Node, que faz `Buffer.toString('latin1')`, e com o
    // fetcher SVRS do Worker). Usar `.text()` assumiria UTF-8 e corromperia acentos.
    const html = new TextDecoder('latin1').decode(await response.arrayBuffer());
    return parser.parseWithDiagnostics(html);
  }

  /**
   * Extrai cookies de um `Headers`. O workerd oculta `Set-Cookie` do `get()`,
   * mas expõe via `getSetCookie()`; fazemos fallback entre os dois.
   */
  private extractCookies(headers: Headers): string {
    const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
    const list =
      typeof withGetSetCookie.getSetCookie === 'function'
        ? withGetSetCookie.getSetCookie()
        : (headers.get('set-cookie')?.split(/,(?=[^;]+=)/) ?? []);
    return list
      .map((c) => c.split(';')[0]?.trim())
      .filter(Boolean)
      .join('; ');
  }
}
