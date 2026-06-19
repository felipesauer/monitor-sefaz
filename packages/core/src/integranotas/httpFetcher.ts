import axios from 'axios';
import type { IntegraNotasFetcher } from './IntegraNotasProvider.js';

/**
 * Fetcher do IntegraNotas para Node (axios). O segredo da API JSON é o header
 * `X-Requested-With: XMLHttpRequest` — sem ele, o IntegraNotas devolve o HTML
 * da SPA em vez do JSON.
 */
export function createHttpIntegraNotasFetcher(timeoutMs = 15_000): IntegraNotasFetcher {
  const http = axios.create({
    timeout: timeoutMs,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
    responseType: 'text',
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return async (url) => {
    const res = await http.get<string>(url);
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  };
}
