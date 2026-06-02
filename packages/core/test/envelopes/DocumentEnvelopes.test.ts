import { describe, it, expect } from 'vitest';
import { Environment } from '@monitor-sefaz/catalog';
import { CTeStatusEnvelopeBuilder } from '../../src/envelopes/CTeStatusEnvelopeBuilder.js';
import { MDFeStatusEnvelopeBuilder } from '../../src/envelopes/MDFeStatusEnvelopeBuilder.js';
import { DCeStatusEnvelopeBuilder } from '../../src/envelopes/DCeStatusEnvelopeBuilder.js';

describe('Document envelopes', () => {
  it('CT-e usa namespace cte, versão 4.00 e consStatServCte', () => {
    const xml = new CTeStatusEnvelopeBuilder().build({ cUF: 43, environment: Environment.Production });
    expect(xml).toContain('http://www.portalfiscal.inf.br/cte');
    expect(xml).toContain('consStatServCte versao="4.00"');
    expect(xml).toContain('<tpAmb>1</tpAmb>');
  });

  it('MDF-e usa namespace mdfe, versão 3.00 e consStatServMDFe', () => {
    const xml = new MDFeStatusEnvelopeBuilder().build({
      cUF: 90,
      environment: Environment.Homologation,
    });
    expect(xml).toContain('http://www.portalfiscal.inf.br/mdfe');
    expect(xml).toContain('consStatServMDFe versao="3.00"');
    expect(xml).toContain('<tpAmb>2</tpAmb>');
  });

  it('DC-e usa namespace dce e xServ STATUS', () => {
    const xml = new DCeStatusEnvelopeBuilder().build({ cUF: 90, environment: Environment.Production });
    expect(xml).toContain('http://www.portalfiscal.inf.br/dce');
    expect(xml).toContain('<xServ>STATUS</xServ>');
  });
});
