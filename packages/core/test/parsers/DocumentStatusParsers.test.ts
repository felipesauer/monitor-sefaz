import { describe, it, expect } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import {
  CTeStatusParser,
  DCeStatusParser,
  MDFeStatusParser,
} from '../../src/parsers/DocumentStatusParsers.js';
import { loadFixture } from '../helpers/fixtures.js';

describe('DocumentStatusParsers', () => {
  it('CTeStatusParser extrai cStat do nó retConsStatServCte', () => {
    const result = new CTeStatusParser().parse(loadFixture('cte-107.xml'));
    expect(result.cStat).toBe(107);
    expect(result.xMotivo).toBe('Servico em Operacao');
  });

  it('MDFeStatusParser extrai cStat do nó retConsStatServMDFe', () => {
    const result = new MDFeStatusParser().parse(loadFixture('mdfe-109.xml'));
    expect(result.cStat).toBe(109);
  });

  it('cada parser expõe o tipo de documento correto', () => {
    expect(new CTeStatusParser().document).toBe(DocumentType.CTe);
    expect(new MDFeStatusParser().document).toBe(DocumentType.MDFe);
    expect(new DCeStatusParser().document).toBe(DocumentType.DCe);
  });
});
