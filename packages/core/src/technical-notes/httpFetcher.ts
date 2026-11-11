import { createPortalClient } from '../http/portalClient.js';
import type { TechnicalNotesFetcher } from './TechnicalNotesProvider.js';

/**
 * Fetcher das Notas Técnicas para Node (axios + cookie jar). Mesma estratégia do
 * fetcher do SVRS/disponibilidade: o portal usa AspxAutoDetectCookieSupport e a
 * página é latin-1.
 */
export function createHttpTechnicalNotesFetcher(timeoutMs = 20_000): TechnicalNotesFetcher {
  const http = createPortalClient(timeoutMs);
  return async (url) => {
    const res = await http.get<ArrayBuffer>(url);
    return Buffer.from(res.data).toString('latin1');
  };
}
