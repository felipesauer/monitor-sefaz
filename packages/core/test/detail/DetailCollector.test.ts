import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import { DetailCollector, recordingSvrsFetcher } from '../../src/detail/DetailCollector.js';
import { SVRS_URLS } from '../../src/svrs/SvrsProvider.js';
import {
  AVAILABILITY_URLS,
  HOMOLOGATION_AVAILABILITY_URLS,
} from '../../src/availability/AvailabilityProvider.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (dir: string, name: string): string =>
  readFileSync(join(here, '..', 'fixtures', dir, name), 'latin1');

/** As páginas que uma rodada do consenso teria baixado, por URL. */
function roundPages(): Map<string, string> {
  const pages = new Map<string, string>();
  pages.set(SVRS_URLS[DocumentType.NFe]!, fixture('svrs', 'nfe-disponibilidade.html'));
  pages.set(SVRS_URLS[DocumentType.NFCe]!, fixture('svrs', 'nfce-disponibilidade.html'));
  pages.set(SVRS_URLS[DocumentType.CTe]!, fixture('svrs', 'cte-disponibilidade.html'));
  pages.set(SVRS_URLS[DocumentType.MDFe]!, fixture('svrs', 'mdfe-disponibilidade.html'));
  pages.set(SVRS_URLS[DocumentType.BPe]!, fixture('svrs', 'bpe-disponibilidade.html'));
  pages.set(
    AVAILABILITY_URLS[DocumentType.NFe]![0]!,
    fixture('availability', 'nfe-disponibilidade.html')
  );
  pages.set(
    AVAILABILITY_URLS[DocumentType.CTe]![0]!,
    fixture('availability', 'cte-disponibilidade.html')
  );
  return pages;
}

describe('DetailCollector', () => {
  const collector = new DetailCollector();

  it('lê as operações de cada autorizador nas páginas da rodada', () => {
    const details = collector.fromPages(roundPages());
    const svrsNfe = details.find(
      (d) => d.document === DocumentType.NFe && d.authorizer === 'SVRS' && d.source === 'svrs'
    )!;
    expect(svrsNfe.environment).toBe(Environment.Production);
    expect(svrsNfe.operations.map((o) => o.operation)).toContain('WS Status');
    expect(svrsNfe.operations.every((o) => !o.operation.includes('(URL)'))).toBe(true);
    expect(svrsNfe.ufs).toHaveLength(16);

    const receitaSp = details.find(
      (d) => d.document === DocumentType.NFe && d.authorizer === 'SP' && d.source === 'availability'
    )!;
    expect(receitaSp.ufs).toEqual(['SP']);
    expect(receitaSp.operations.map((o) => o.operation)).toContain('Status Serviço4');
    expect(receitaSp.operations.some((o) => o.operation.includes('Tempo'))).toBe(false);
  });

  it('mostra CT-e OS e GTV-e como operações do CT-e', () => {
    const details = collector.fromPages(roundPages());
    const svsp = details.find((d) => d.document === DocumentType.CTe && d.authorizer === 'SVSP')!;
    expect([...svsp.ufs].sort()).toEqual(['AP', 'PE', 'RR']);
    expect(svsp.operations.map((o) => o.operation)).toEqual(
      expect.arrayContaining(['Recepção CT-e OS', 'Recepção GTVE'])
    );
  });

  it('dá às linhas de contingência as UFs que vão para ela', () => {
    const details = collector.fromPages(roundPages());
    const svcrs = details.find((d) => d.document === DocumentType.NFe && d.authorizer === 'SVCRS')!;
    expect(svcrs.ufs).toEqual(expect.arrayContaining(['AM', 'BA', 'PR']));
  });

  it('não repete operações com o nome de outro documento', () => {
    const details = collector.fromPages(roundPages());
    // O DC-e usa a página do MDF-e no SVRS; a NFC-e usa a da NF-e na Receita.
    expect(details.some((d) => d.document === DocumentType.DCe)).toBe(false);
    expect(
      details.some((d) => d.document === DocumentType.NFCe && d.source === 'availability')
    ).toBe(false);
    expect(details.some((d) => d.document === DocumentType.NFCe && d.source === 'svrs')).toBe(true);
  });

  it('acrescenta a homologação da Receita e ignora a que falha', async () => {
    const asked: string[] = [];
    const details = await collector.collect(roundPages(), async (url) => {
      asked.push(url);
      if (url === HOMOLOGATION_AVAILABILITY_URLS[DocumentType.CTe]) throw new Error('fora do ar');
      return fixture('availability', 'nfe-disponibilidade.html');
    });

    expect(asked.sort()).toEqual(Object.values(HOMOLOGATION_AVAILABILITY_URLS).sort());
    const hom = details.filter((d) => d.environment === Environment.Homologation);
    expect(hom.length).toBeGreaterThan(10);
    expect(hom.every((d) => d.document === DocumentType.NFe)).toBe(true);
  });

  it('o fetcher que grava guarda cada página baixada', async () => {
    const pages = new Map<string, string>();
    const fetcher = recordingSvrsFetcher(async (url) => `<html>${url}</html>`, pages);
    await fetcher('https://exemplo/a');
    expect(pages.get('https://exemplo/a')).toBe('<html>https://exemplo/a</html>');
  });
});
