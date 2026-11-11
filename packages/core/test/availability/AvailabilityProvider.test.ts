import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';

const here = dirname(fileURLToPath(import.meta.url));
const nfePage = readFileSync(
  join(here, '..', 'fixtures', 'availability', 'nfe-disponibilidade.html')
);

/** Respostas que o cliente HTTP falso devolve, em ordem. */
const responses: { status: number; body: Buffer }[] = [];
const get = vi.fn(async (_url: string) => {
  const next = responses.shift() ?? { status: 500, body: Buffer.from('') };
  return { status: next.status, data: next.body };
});

// O provider monta o cliente com `createPortalClient`; trocamos o cliente, e
// nenhuma requisição sai para a rede (regra 5: nunca a SEFAZ real nos testes).
const head = vi.fn(async (_url: string) => ({ status: 200, data: '' }));
vi.mock('../../src/http/portalClient.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/http/portalClient.js')>()),
  createPortalClient: () => ({ get, head }),
}));

const { HttpAvailabilityProvider, AVAILABILITY_URLS, HOMOLOGATION_AVAILABILITY_URLS } =
  await import('../../src/availability/AvailabilityProvider.js');

const noSleep = async (): Promise<void> => {};

describe('HttpAvailabilityProvider', () => {
  beforeEach(() => {
    responses.length = 0;
    get.mockClear();
    head.mockClear();
  });

  it('avisa o gancho onPage com a página válida baixada', async () => {
    responses.push({ status: 200, body: nfePage });
    const pages = new Map<string, string>();
    const provider = new HttpAvailabilityProvider(
      1000,
      noSleep,
      () => 0.5,
      (url, html) => pages.set(url, html)
    );

    const rows = await provider.fetch(DocumentType.NFe);
    expect(rows.length).toBeGreaterThan(10);
    expect([...pages.keys()]).toEqual([AVAILABILITY_URLS[DocumentType.NFe]![0]]);
  });

  it('não avisa o gancho quando a página não traz a tabela', async () => {
    responses.push(
      ...Array.from({ length: 3 }, () => ({ status: 200, body: Buffer.from('<p>erro</p>') }))
    );
    const onPage = vi.fn();
    const provider = new HttpAvailabilityProvider(1000, noSleep, () => 0.5, onPage);

    await expect(provider.fetch(DocumentType.NFe)).rejects.toThrow();
    expect(onPage).not.toHaveBeenCalled();
  });

  it('fetchPage tenta de novo e devolve o HTML de uma página de homologação', async () => {
    responses.push({ status: 503, body: Buffer.from('') }, { status: 200, body: nfePage });
    const provider = new HttpAvailabilityProvider(1000, noSleep, () => 0.5);
    const url = HOMOLOGATION_AVAILABILITY_URLS[DocumentType.NFe]!;

    const html = await provider.fetchPage(url, DocumentType.NFe);
    expect(html).toContain('bola_');
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0]![0]).toBe(url);
  });

  it('aquece a conexão com um HEAD na página do documento, sem baixá-la', async () => {
    const provider = new HttpAvailabilityProvider(20_000, noSleep);
    await provider.warmUp(DocumentType.NFe);
    expect(head).toHaveBeenCalledWith(AVAILABILITY_URLS[DocumentType.NFe]![0], expect.anything());
    expect(get).not.toHaveBeenCalled();
  });

  it('não falha quando o aquecimento falha', async () => {
    head.mockRejectedValueOnce(new Error('ECONNRESET'));
    const provider = new HttpAvailabilityProvider(20_000, noSleep);
    await expect(provider.warmUp(DocumentType.NFe)).resolves.toBeUndefined();
  });
});
