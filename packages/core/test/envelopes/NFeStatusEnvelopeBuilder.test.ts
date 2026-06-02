import { describe, it, expect } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import {
  NFCeStatusEnvelopeBuilder,
  NFeStatusEnvelopeBuilder,
} from '../../src/envelopes/NFeStatusEnvelopeBuilder.js';

describe('NFeStatusEnvelopeBuilder', () => {
  const builder = new NFeStatusEnvelopeBuilder();

  it('monta envelope com cUF, tpAmb e xServ=STATUS para produção', () => {
    const xml = builder.build({ cUF: 35, environment: Environment.Production });
    expect(xml).toContain('<cUF>35</cUF>');
    expect(xml).toContain('<tpAmb>1</tpAmb>');
    expect(xml).toContain('<xServ>STATUS</xServ>');
    expect(xml).toContain('versao="4.00"');
  });

  it('usa tpAmb=2 em homologação', () => {
    const xml = builder.build({ cUF: 43, environment: Environment.Homologation });
    expect(xml).toContain('<tpAmb>2</tpAmb>');
  });

  it('expõe o tipo de documento correto', () => {
    expect(builder.document).toBe(DocumentType.NFe);
    expect(new NFCeStatusEnvelopeBuilder().document).toBe(DocumentType.NFCe);
  });
});
