import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import type { SvrsFetcher } from './SvrsProvider.js';

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Fetcher do SVRS para Node (axios + cookie jar). O portal usa o esquema ASP.NET
 * `AspxAutoDetectCookieSupport` — sem cookie jar entra em loop de redirect —, por
 * isso a mesma estratégia do `HttpAvailabilityProvider`. A página é latin-1.
 *
 * ISOLADO em arquivo próprio (e não default do provider) para que o Worker possa
 * importar o `SvrsProvider` sem puxar axios/tough-cookie para o seu bundle.
 */
export function createHttpSvrsFetcher(timeoutMs = 20_000): SvrsFetcher {
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
