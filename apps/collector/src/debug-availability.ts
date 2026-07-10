import { AvailabilityParser } from '@monitor-sefaz/core';
import { DocumentType } from '@monitor-sefaz/catalog';

/**
 * Script de DIAGNÓSTICO (temporário) para entender por que a fonte `availability`
 * vem 0/135. Busca a página da Receita com `fetch` nativo (Node 22), resolvendo o
 * cookie ASP.NET manualmente como o WorkerAvailabilityProvider faz, decodifica
 * latin-1 e reporta o que a Receita devolve no runner: status, tamanho, sinais de
 * erro/tabela, cabeçalho e o que o parser extrai. Sem deps externas (o collector
 * não tem axios/cheerio); não faz parte do pipeline.
 */
const PAGE = 'https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx';
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' };

function cookiesFrom(headers: Headers): string {
  const withGet = headers as Headers & { getSetCookie?: () => string[] };
  const list =
    typeof withGet.getSetCookie === 'function'
      ? withGet.getSetCookie()
      : (headers.get('set-cookie')?.split(/,(?=[^;]+=)/) ?? []);
  return list.map((c) => c.split(';')[0]?.trim()).filter(Boolean).join('; ');
}

async function main(): Promise<void> {
  let response = await fetch(PAGE, { headers: HEADERS, redirect: 'manual' });
  console.log(`1ª resposta: HTTP ${response.status}`);
  if (response.status === 301 || response.status === 302) {
    const cookie = cookiesFrom(response.headers);
    console.log(`redirect com cookie: ${cookie ? 'sim' : 'não'}`);
    response = cookie
      ? await fetch(PAGE, { headers: { ...HEADERS, Cookie: cookie } })
      : await fetch(new URL(response.headers.get('location') ?? PAGE, PAGE).toString(), { headers: HEADERS });
  }

  const html = new TextDecoder('latin1').decode(await response.arrayBuffer());
  console.log(`resposta final: HTTP ${response.status} | ${html.length} bytes | content-type: ${response.headers.get('content-type')}`);

  console.log('contém "Autorizador":', html.includes('Autorizador'));
  console.log('contém "bola_":', html.includes('bola_'));
  console.log('contém "erro"/"Ocorreu um erro":', /erro\.aspx/i.test(html) || /Ocorreu um erro/i.test(html));
  console.log('título:', (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '(sem)').trim().replace(/\s+/g, ' ').slice(0, 120));

  // Cabeçalhos <th> via regex (sem cheerio)
  const ths = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => m[1]!.replace(/<[^>]+>/g, '').trim());
  console.log(`<th> encontrados (${ths.length}):`, ths.slice(0, 12).join(' | '));

  const res = new AvailabilityParser(DocumentType.NFe).parseWithDiagnostics(html);
  console.log(`parser: ${res.rows.length} linhas | headerMatched=${res.headerMatched}`);

  console.log('primeiros 300 chars do HTML:', html.slice(0, 300).replace(/\s+/g, ' '));
}

void main();
