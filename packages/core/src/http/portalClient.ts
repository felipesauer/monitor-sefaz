import axios, { type AxiosInstance } from 'axios';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';
import { CookieJar } from 'tough-cookie';

const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Cliente HTTP para os portais da SEFAZ (Receita, SVRS) em Node: cookie jar e
 * conexão reaproveitada.
 *
 * O cookie jar é exigido pelo esquema ASP.NET `AspxAutoDetectCookieSupport` —
 * sem ele a página entra em loop de redirect. Antes ele vinha do
 * `axios-cookiejar-support`, que cria um agente HTTP NOVO a cada requisição:
 * nenhuma conexão era reaproveitada, e cada busca pagava DNS, TCP e TLS de novo.
 * Aqui o agente é um só por cliente, com `keepAlive`, então a segunda
 * requisição ao mesmo host já chega pela conexão aberta (ADR-23).
 */
export function createPortalClient(timeoutMs: number): AxiosInstance {
  const jar = new CookieJar();
  return axios.create({
    httpAgent: new HttpCookieAgent({ cookies: { jar }, keepAlive: true }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar }, keepAlive: true }),
    timeout: timeoutMs,
    maxRedirects: 15,
    responseType: 'arraybuffer', // as páginas são latin-1; quem lê decodifica
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    validateStatus: () => true,
  });
}

/**
 * Abre a conexão com o host (e acerta o cookie do portal) com um `HEAD` leve,
 * para a requisição seguinte medir só o tempo de resposta da fonte, e não o de
 * abrir a conexão a partir do runner (que fica fora do Brasil). Uma falha aqui
 * não importa: a busca de verdade vem depois e trata os próprios erros.
 */
export async function warmUpConnection(client: AxiosInstance, url: string): Promise<void> {
  try {
    await client.head(url, { responseType: 'text' });
  } catch {
    // aquecimento é só uma tentativa
  }
}
