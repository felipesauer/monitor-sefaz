import { createPortalClient } from '../http/portalClient.js';
import type { SvrsFetcher } from './SvrsProvider.js';

/**
 * Fetcher do SVRS para Node (axios + cookie jar). O portal usa o esquema ASP.NET
 * `AspxAutoDetectCookieSupport` — sem cookie jar entra em loop de redirect —, por
 * isso a mesma estratégia do `HttpAvailabilityProvider`. A página é latin-1.
 *
 * ISOLADO em arquivo próprio (e não default do provider) para que o Worker possa
 * importar o `SvrsProvider` sem puxar axios/tough-cookie para o seu bundle.
 */
export function createHttpSvrsFetcher(timeoutMs = 20_000): SvrsFetcher {
  const http = createPortalClient(timeoutMs);
  return async (url) => {
    const res = await http.get<ArrayBuffer>(url);
    return Buffer.from(res.data).toString('latin1');
  };
}
