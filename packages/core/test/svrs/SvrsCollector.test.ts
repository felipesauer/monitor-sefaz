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
  if (url.includes('/Nfce/')) return fixture('nfce-disponibilidade.html');
  if (url.includes('/Cte/')) return fixture('cte-disponibilidade.html');
  if (url.includes('/Mdfe/')) return fixture('mdfe-disponibilidade.html');
  if (url.includes('/Bpe/')) return fixture('bpe-disponibilidade.html');
  if (url.includes('/Nfcom/')) return fixture('nfcom-disponibilidade.html');
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

  it('cobre o BP-e só nas UFs que o SVRS autoriza', async () => {
    const collector = new SvrsCollector(new SvrsProvider(fixtureFetcher));
    const bpe = (await collector.collect()).filter((s) => s.document === DocumentType.BPe);

    // MG, MS, MT, PR e SP autorizam o BP-e em ambiente próprio, fora desta página.
    expect(bpe).toHaveLength(22);
    for (const uf of ['MG', 'MS', 'MT', 'PR', 'SP']) {
      expect(bpe.some((s) => s.uf === uf)).toBe(false);
    }
    const rs = bpe.find((s) => s.uf === 'RS');
    expect(rs?.authorizer).toBe('SVRS');
    expect(rs?.state).toBe(ServiceState.Operational);
  });

  it('não atribui ao SVRS o CT-e de AP, PE e RR, que autorizam na SVSP', async () => {
    const collector = new SvrsCollector(new SvrsProvider(fixtureFetcher));
    const cte = (await collector.collect()).filter((s) => s.document === DocumentType.CTe);

    for (const uf of ['AP', 'PE', 'RR']) {
      expect(cte.some((s) => s.uf === uf)).toBe(false);
    }
    expect(cte.find((s) => s.uf === 'AC')?.authorizer).toBe('SVRS');
  });

  it('cobre a NFCom só nas UFs que o SVRS autoriza', async () => {
    const collector = new SvrsCollector(new SvrsProvider(fixtureFetcher));
    const nfcom = (await collector.collect()).filter((s) => s.document === DocumentType.NFCom);

    // MG, MS e MT autorizam a NFCom em ambiente próprio, fora desta página.
    expect(nfcom).toHaveLength(24);
    for (const uf of ['MG', 'MS', 'MT']) {
      expect(nfcom.some((s) => s.uf === uf)).toBe(false);
    }
    expect(nfcom.every((s) => s.authorizer === 'SVRS')).toBe(true);
  });

  it('lê a NFC-e na página da NFC-e, não na da NF-e', async () => {
    const urls: string[] = [];
    const recording: SvrsFetcher = async (url) => {
      urls.push(url);
      return fixtureFetcher(url);
    };
    const out = await new SvrsCollector(new SvrsProvider(recording)).collect();

    expect(urls).toContain('https://dfe-portal.svrs.rs.gov.br/Nfce/Disponibilidade');
    // RS autoriza a NFC-e na SEFAZ-RS; as UFs do SVRS vêm da outra seção da página.
    const nfce = out.filter((s) => s.document === DocumentType.NFCe);
    expect(nfce.find((s) => s.uf === 'RS')?.authorizer).toBe('RS');
    expect(nfce.find((s) => s.uf === 'AC')?.authorizer).toBe('SVRS');
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
