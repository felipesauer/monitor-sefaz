import { XMLParser } from 'fast-xml-parser';
import type { DocumentType } from '@monitor-sefaz/catalog';
import {
  HtmlResponseError,
  InvalidXmlError,
  MissingStatusNodeError,
  SoapFaultError,
} from '../domain/errors.js';
import type { ParsedStatus, ResponseParser } from './ResponseParser.js';

/**
 * Remove o prefixo de namespace de um nome de nó (ex: `soap:Body` → `Body`).
 * Diferentes UFs usam prefixos distintos; normalizá-los torna a busca agnóstica.
 */
function stripPrefix(name: string): string {
  const idx = name.indexOf(':');
  return idx === -1 ? name : name.slice(idx + 1);
}

/**
 * Busca recursivamente o primeiro valor cujo nome de nó (sem prefixo) é igual a
 * `key`. Necessário porque cada UF aninha o retorno sob namespaces diferentes.
 */
function findDeep(node: unknown, key: string): unknown {
  if (node === null || typeof node !== 'object') {
    return null;
  }
  for (const [rawName, value] of Object.entries(node as Record<string, unknown>)) {
    if (stripPrefix(rawName) === key) {
      return value;
    }
    const found = findDeep(value, key);
    if (found !== null && found !== undefined) {
      return found;
    }
  }
  return null;
}

function asScalar(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    // fast-xml-parser pode aninhar como { '#text': '107' }
    const text = (value as Record<string, unknown>)['#text'];
    return text === undefined ? null : String(text);
  }
  return String(value);
}

/**
 * Base reutilizável para parsers de "consulta status do serviço". Cada documento
 * fornece apenas o nome do nó de retorno; toda a lógica namespace-agnóstica,
 * detecção de HTML e SOAP Fault é compartilhada (porte do protótipo original).
 */
export abstract class AbstractRetConsParser implements ResponseParser {
  public abstract readonly document: DocumentType;
  /** Nome do nó de retorno do documento (ex: `retConsStatServ`). */
  protected abstract readonly retNodeName: string;

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    trimValues: true,
  });

  public parse(xml: string): ParsedStatus {
    const trimmed = xml.trim().toLowerCase();
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
      throw new HtmlResponseError();
    }

    let tree: unknown;
    try {
      tree = this.parser.parse(xml);
    } catch (err) {
      throw new InvalidXmlError(err instanceof Error ? err.message : String(err));
    }

    const retNode = findDeep(tree, this.retNodeName);
    if (retNode === null) {
      const fault = findDeep(tree, 'faultstring') ?? findDeep(tree, 'Fault');
      if (fault !== null) {
        throw new SoapFaultError(JSON.stringify(fault));
      }
      throw new MissingStatusNodeError(this.retNodeName);
    }

    const ret = retNode as Record<string, unknown>;
    const cStatRaw = asScalar(findDeep(ret, 'cStat'));
    if (cStatRaw === null) {
      throw new MissingStatusNodeError('cStat');
    }

    const tMedRaw = asScalar(findDeep(ret, 'tMed'));
    return {
      cStat: Number.parseInt(cStatRaw, 10),
      xMotivo: asScalar(findDeep(ret, 'xMotivo')) ?? '—',
      dhRecbto: asScalar(findDeep(ret, 'dhRecbto')),
      tMed: tMedRaw === null ? null : Number.parseInt(tMedRaw, 10),
    };
  }
}
