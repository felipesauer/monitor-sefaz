import { describe, it, expect } from 'vitest';
import { NFeStatusParser } from '../../src/parsers/NFeStatusParser.js';
import {
  HtmlResponseError,
  InvalidXmlError,
  MissingStatusNodeError,
  SoapFaultError,
} from '../../src/domain/errors.js';
import { loadFixture } from '../helpers/fixtures.js';

describe('NFeStatusParser', () => {
  const parser = new NFeStatusParser();

  it('extrai cStat 107 e xMotivo de uma resposta operacional', () => {
    const result = parser.parse(loadFixture('nfe-107.xml'));
    expect(result.cStat).toBe(107);
    expect(result.xMotivo).toBe('Servico em Operacao');
    expect(result.tMed).toBe(1);
    expect(result.dhRecbto).toBe('2026-06-02T11:00:00-03:00');
  });

  it('extrai cStat 108 (paralisado momentaneamente)', () => {
    const result = parser.parse(loadFixture('nfe-108.xml'));
    expect(result.cStat).toBe(108);
  });

  it('é agnóstico de namespace (resposta SVRS com prefixos ns2/ns3)', () => {
    const result = parser.parse(loadFixture('nfe-109-svrs.xml'));
    expect(result.cStat).toBe(109);
    expect(result.xMotivo).toBe('Servico Paralisado sem Previsao');
    expect(result.tMed).toBeNull();
  });

  it('lança HtmlResponseError quando o corpo é HTML', () => {
    expect(() => parser.parse(loadFixture('html-403.html'))).toThrow(HtmlResponseError);
  });

  it('lança SoapFaultError quando há SOAP Fault', () => {
    expect(() => parser.parse(loadFixture('soap-fault.xml'))).toThrow(SoapFaultError);
  });

  it('lança InvalidXmlError quando o XML é malformado', () => {
    expect(() => parser.parse(loadFixture('invalid.xml'))).toThrow(InvalidXmlError);
  });

  it('lança MissingStatusNodeError quando falta o nó de retorno', () => {
    const xml = '<?xml version="1.0"?><soap:Envelope xmlns:soap="x"><soap:Body></soap:Body></soap:Envelope>';
    expect(() => parser.parse(xml)).toThrow(MissingStatusNodeError);
  });
});
