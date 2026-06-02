import {
  AvailabilityParser,
  AVAILABILITY_URLS,
  type AvailabilityRow,
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
  constructor(private readonly parser = new AvailabilityParser()) {}

  public supportedDocuments(): DocumentType[] {
    return Object.keys(AVAILABILITY_URLS) as DocumentType[];
  }

  public async fetch(document: DocumentType): Promise<AvailabilityRow[]> {
    const url = AVAILABILITY_URLS[document];
    if (!url) {
      return [];
    }

    const headers: Record<string, string> = {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    };

    // 1ª requisição: pode vir 302 setando o cookie de detecção (ASP.NET).
    let response = await fetch(url, { headers, redirect: 'manual' });

    if (response.status === 301 || response.status === 302) {
      const cookie = this.extractCookies(response.headers);
      const location = response.headers.get('location') ?? url;
      const next = new URL(location, url).toString();
      const retryHeaders = cookie ? { ...headers, Cookie: cookie } : headers;
      response = await fetch(next, { headers: retryHeaders });
    }

    const html = await response.text();
    return this.parser.parse(html);
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
