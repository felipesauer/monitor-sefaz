import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import { SvrsCollector } from '../../src/svrs/SvrsCollector.js';
import { SvrsProvider, type SvrsFetcher } from '../../src/svrs/SvrsProvider.js';
import { ServiceState } from '../../src/domain/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): string =>
  readFileSync(resolve(here, '../fixtures/svrs', name), 'latin1');

/** Fetcher que serve a fixture do documento pedido pela URL. */
const fixtureFetcher: SvrsFetcher = async (url) => {
  if (url.includes('/Nfe/')) return fixture('nfe-disponibilidade.html');
  if (url.includes('/Cte/')) return fixture('cte-disponibilidade.html');
  if (url.includes('/Mdfe/')) return fixture('mdfe-disponibilidade.html');
  throw new Error(`URL inesperada: ${url}`);
};

describe('SvrsCollector', () => {
  it('expande o status do SVRS por UF, com cStat real e source "svrs"', async () => {
    const collector = new SvrsCollector(new SvrsProvider(fixtureFetcher));
    const out = await collector.collect();

    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.source).toBe('svrs');
    }

    // O RS de NF-e vem da seção SEFAZ-RS; deve estar presente e operacional no snapshot.
    const rsNfe = out.find((s) => s.uf === 'RS' && s.document === DocumentType.NFe);
    expect(rsNfe).toBeDefined();
    expect(rsNfe!.state).toBe(ServiceState.Operational);
    expect(rsNfe!.cStat).not.toBeNull();

    // MDF-e é nacional no SVRS: deve cobrir várias UFs.
    const mdfe = out.filter((s) => s.document === DocumentType.MDFe);
    expect(mdfe.length).toBeGreaterThan(1);
  });

  it('propaga o horário de aferição do SVRS em sourceCheckedAt', async () => {
    const collector = new SvrsCollector(new SvrsProvider(fixtureFetcher));
    const out = await collector.collect();
    const withTime = out.filter((s) => s.sourceCheckedAt);
    expect(withTime.length).toBeGreaterThan(0);
    for (const s of withTime) {
      expect(s.sourceCheckedAt).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });
});
