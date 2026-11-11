import { describe, it, expect } from 'vitest';
import { Catalog } from '../src/Catalog.js';
import { DocumentType, Environment } from '../src/types.js';

describe('Catalog', () => {
  const catalog = new Catalog();

  it('resolve SP como autorizador próprio com URL de produção', () => {
    const entry = catalog.resolve(DocumentType.NFe, 'SP', Environment.Production);
    expect(entry?.authorizer).toBe('SP');
    expect(entry?.url).toContain('fazenda.sp.gov.br');
    expect(entry?.cUF).toBe(35);
  });

  it('delega UF sem autorizador próprio a SVRS', () => {
    expect(catalog.resolveAuthorizer(DocumentType.NFe, 'AC')).toBe('SVRS');
  });

  it('delega MA a SVAN para NF-e', () => {
    expect(catalog.resolveAuthorizer(DocumentType.NFe, 'MA')).toBe('SVAN');
  });

  it('lista 27 serviços de NF-e em produção', () => {
    expect(catalog.list(DocumentType.NFe, Environment.Production)).toHaveLength(27);
  });

  it('usa endpoint de homologação no ambiente de homologação', () => {
    const entry = catalog.resolve(DocumentType.NFe, 'SP', Environment.Homologation);
    // a URL real da SEFAZ-SP de homologação contém "homologacao" no domínio
    expect(entry?.url).toContain('homologacao');
  });

  it('aponta a NF-e para o serviço de status da versão 4 em todos os autorizadores', () => {
    for (const environment of [Environment.Production, Environment.Homologation]) {
      for (const entry of catalog.list(DocumentType.NFe, environment)) {
        expect(entry.url, `${entry.uf} (${entry.authorizer})`).toMatch(/StatusServico4/i);
      }
    }
  });

  it('separa o RS do SVRS na NF-e, como a relação oficial', () => {
    const rs = catalog.resolve(DocumentType.NFe, 'RS', Environment.Production);
    const ac = catalog.resolve(DocumentType.NFe, 'AC', Environment.Production);
    expect(rs?.url).toContain('nfe.sefazrs.rs.gov.br');
    expect(ac?.url).toContain('nfe.svrs.rs.gov.br');
  });

  it('dá à NFC-e os hosts dela, não os da NF-e', () => {
    const differ = ['AM', 'MG', 'MS', 'MT', 'PR', 'RS', 'SP', 'AC'] as const;
    for (const uf of differ) {
      for (const environment of [Environment.Production, Environment.Homologation]) {
        const nfe = catalog.resolve(DocumentType.NFe, uf, environment)!.url;
        const nfce = catalog.resolve(DocumentType.NFCe, uf, environment)!.url;
        expect(nfce, uf).not.toBe(nfe);
        expect(nfce, uf).toContain('nfce');
      }
    }
  });

  it('mantém a NFC-e de GO no mesmo host da NF-e, como a relação oficial', () => {
    const nfe = catalog.resolve(DocumentType.NFe, 'GO', Environment.Production)!.url;
    expect(catalog.resolve(DocumentType.NFCe, 'GO', Environment.Production)!.url).toBe(nfe);
  });

  it('manda o CT-e de AP, PE e RR para a SVSP, no endereço da SEFAZ-SP', () => {
    for (const uf of ['AP', 'PE', 'RR'] as const) {
      const entry = catalog.resolve(DocumentType.CTe, uf, Environment.Production);
      expect(entry?.authorizer, uf).toBe('SVSP');
      expect(entry?.url, uf).toBe('https://nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx');
    }
    expect(catalog.resolveAuthorizer(DocumentType.CTe, 'AC')).toBe('SVRS');
    expect(catalog.resolve(DocumentType.CTe, 'PE', Environment.Homologation)?.url).toContain(
      'homologacao.nfe.fazenda.sp.gov.br'
    );
  });

  it('resolve a NFCom em MG, MS e MT e manda o resto ao SVRS', () => {
    const entries = catalog.list(DocumentType.NFCom, Environment.Production);
    expect(entries).toHaveLength(27);
    const own = entries.filter((e) => e.authorizer === e.uf).map((e) => e.uf);
    expect(own.sort()).toEqual(['MG', 'MS', 'MT']);
    expect(catalog.resolveAuthorizer(DocumentType.NFCom, 'SP')).toBe('SVRS');
    for (const environment of [Environment.Production, Environment.Homologation]) {
      for (const entry of catalog.list(DocumentType.NFCom, environment)) {
        expect(entry.url, entry.uf).toContain('NFComStatusServico');
      }
    }
  });

  it('resolve CT-e de SP no autorizador próprio', () => {
    const entry = catalog.resolve(DocumentType.CTe, 'SP', Environment.Production);
    expect(entry?.authorizer).toBe('SP');
    expect(entry?.url).toContain('CTeStatusServico');
  });

  it('resolve a contingência SVC da NF-e por UF', () => {
    expect(catalog.resolveContingency(DocumentType.NFe, 'SP')).toBe('SVCAN');
    expect(catalog.resolveContingency(DocumentType.NFe, 'PR')).toBe('SVCRS');
    expect(catalog.resolveContingency(DocumentType.NFe, 'AC')).toBe('SVCAN');
  });

  it('manda quem autoriza no SVRS para o SVC-AN e o SVAN para o SVC-RS', () => {
    // O SVC-RS roda na infraestrutura do SVRS: contingenciar ali quem já
    // depende do SVRS não protegeria nada.
    for (const { uf, authorizer } of catalog.list(DocumentType.NFe, Environment.Production)) {
      const svc = catalog.resolveContingency(DocumentType.NFe, uf);
      if (authorizer === 'SVRS') expect(svc, uf).toBe('SVCAN');
      if (authorizer === 'SVAN') expect(svc, uf).toBe('SVCRS');
    }
  });

  it('não inventa SVC para documento sem contingência mapeada', () => {
    expect(catalog.resolveContingency(DocumentType.NFCe, 'SP')).toBeNull();
  });

  it('resolve o BP-e nos cinco autorizadores próprios e manda o resto, inclusive o RS, ao SVRS', () => {
    const own = catalog
      .list(DocumentType.BPe, Environment.Production)
      .filter((entry) => entry.authorizer !== 'SVRS')
      .map((entry) => entry.uf)
      .sort();
    expect(own).toEqual(['MG', 'MS', 'MT', 'PR', 'SP']);
    expect(catalog.resolveAuthorizer(DocumentType.BPe, 'RS')).toBe('SVRS');
    expect(catalog.list(DocumentType.BPe, Environment.Production)).toHaveLength(27);
    expect(catalog.resolve(DocumentType.BPe, 'MG', Environment.Production)?.url).toContain(
      'BPeStatusServico'
    );
  });

  it('centraliza MDF-e e DC-e no SVRS', () => {
    expect(catalog.resolve(DocumentType.MDFe, 'PA', Environment.Production)?.authorizer).toBe(
      'SVRS'
    );
    expect(catalog.resolve(DocumentType.DCe, 'PA', Environment.Production)?.authorizer).toBe(
      'SVRS'
    );
  });
});
