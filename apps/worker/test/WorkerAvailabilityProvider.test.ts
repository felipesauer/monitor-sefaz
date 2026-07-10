import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DocumentType } from '@monitor-sefaz/catalog';
import { AvailabilityParser } from '@monitor-sefaz/core';
import { WorkerAvailabilityProvider } from '../src/WorkerAvailabilityProvider.js';

// A fixture é a página REAL da Receita, salva em latin-1 (mesma usada nos testes
// do core). Reaproveitamos o caminho do fixture do pacote core.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(
  here,
  '..',
  '..',
  '..',
  'packages',
  'core',
  'test',
  'fixtures',
  'availability',
  'nfe-disponibilidade.html'
);
// Bytes crus latin-1 (não decodificados) — é isso que a rede entrega.
const fixtureLatin1Bytes = readFileSync(fixturePath, 'latin1');

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Response falso servindo os bytes latin-1 da fixture (sem redirect). */
function latin1Response(): Response {
  // Recria o array de bytes a partir da string latin-1 (1 char = 1 byte).
  const bytes = Uint8Array.from(fixtureLatin1Bytes, (c) => c.charCodeAt(0));
  return new Response(bytes, { status: 200 });
}

describe('WorkerAvailabilityProvider — paridade com o caminho Node', () => {
  it('decodifica latin-1 e produz o MESMO resultado que o parser do core', async () => {
    globalThis.fetch = (async () => latin1Response()) as typeof fetch;

    const provider = new WorkerAvailabilityProvider();
    const workerRows = await provider.fetch(DocumentType.NFe);

    // Referência: o parser do core sobre a MESMA fixture decodificada como latin-1
    // (é como o collector Node faz via Buffer.toString('latin1')).
    const expected = new AvailabilityParser(DocumentType.NFe).parse(fixtureLatin1Bytes);

    expect(workerRows.length).toBeGreaterThan(0);
    expect(workerRows).toEqual(expected);
  });

  it('faz backoff entre tentativas e tem sucesso após falha transitória', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) throw new Error('conexão recusada (transitória)');
      return latin1Response();
    }) as typeof fetch;

    const delays: number[] = [];
    const provider = new WorkerAvailabilityProvider(
      async (ms) => {
        delays.push(ms);
      },
      () => 0.5 // jitter neutro → backoff = 500 × attempt
    );
    const rows = await provider.fetch(DocumentType.NFe);

    expect(calls).toBe(2);
    expect(rows.length).toBeGreaterThan(0);
    expect(delays).toEqual([500]); // um backoff entre a 1ª e a 2ª tentativa
  });

  it('esvazia a fonte quando o layout muda (cabeçalho irreconhecível), mesmo com linhas', async () => {
    // Página com linhas de dados plausíveis, mas SEM um cabeçalho que casa
    // "status"/"tempo" → drift. Confiar nessas linhas leria colunas erradas; o
    // provider trata como falha (esvazia → degraded no consenso) em vez de publicar.
    const driftHtml = `<table>
      <tr><th>Coluna A</th><th>Coluna B</th><th>Coluna C</th><th>Coluna D</th>
          <th>Coluna E</th><th>Coluna F</th></tr>
      <tr><td>SP</td><td><img src="bola_verde.png"></td><td><img src="bola_verde.png"></td>
          <td><img src="bola_verde.png"></td><td><img src="bola_verde.png"></td>
          <td><img src="bola_verde.png"></td></tr>
    </table>`;
    const bytes = Uint8Array.from(driftHtml, (c) => c.charCodeAt(0));
    globalThis.fetch = (async () => new Response(bytes, { status: 200 })) as typeof fetch;

    const provider = new WorkerAvailabilityProvider(async () => {}, () => 0.5);
    // Sem cabeçalho reconhecível em nenhuma tentativa → lança (fonte vazia).
    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow(/layout inesperado/);
  });
});
