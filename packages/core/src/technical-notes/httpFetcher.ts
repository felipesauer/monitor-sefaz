import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import type { TechnicalNotesFetcher } from './TechnicalNotesProvider.js';

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Fetcher das Notas Técnicas para Node (axios + cookie jar). Mesma estratégia do
 * fetcher do SVRS/disponibilidade: o portal usa AspxAutoDetectCookieSupport e a
 * página é latin-1.
 */
export function createHttpTechnicalNotesFetcher(timeoutMs = 20_000): TechnicalNotesFetcher {
  const jar = new CookieJar();
  const http: AxiosInstance = wrapper(
    axios.create({
      jar,
      timeout: timeoutMs,
      maxRedirects: 15,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      validateStatus: () => true,
    })
  );
  return async (url) => {
    const res = await http.get<ArrayBuffer>(url);
    return Buffer.from(res.data).toString('latin1');
  };
}
