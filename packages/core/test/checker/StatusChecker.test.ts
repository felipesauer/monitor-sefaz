import { describe, it, expect, vi } from 'vitest';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';
import { StatusChecker } from '../../src/checker/StatusChecker.js';
import { StatusClassifier } from '../../src/checker/StatusClassifier.js';
import { NFeStatusEnvelopeBuilder } from '../../src/envelopes/NFeStatusEnvelopeBuilder.js';
import { NFeStatusParser } from '../../src/parsers/NFeStatusParser.js';
import type { SoapClient, SoapResponse } from '../../src/checker/SoapClient.js';
import { ServiceState, type ServiceTarget } from '../../src/domain/types.js';
import { loadFixture } from '../helpers/fixtures.js';

const target: ServiceTarget = {
  document: DocumentType.NFe,
  uf: 'SP',
  authorizer: 'SP',
  environment: Environment.Production,
  cUF: 35,
  url: 'https://example.test/nfe',
};

function buildChecker(client: SoapClient): StatusChecker {
  return new StatusChecker(
    new Map([[DocumentType.NFe, new NFeStatusEnvelopeBuilder()]]),
    new Map([[DocumentType.NFe, new NFeStatusParser()]]),
    client,
    new StatusClassifier(),
    { now: () => 1000 }
  );
}

describe('StatusChecker', () => {
  it('retorna Operational com latência medida quando cStat é 107', async () => {
    const client: SoapClient = {
      post: vi.fn(
        async (): Promise<SoapResponse> => ({
          status: 200,
          body: loadFixture('nfe-107.xml'),
          latencyMs: 42,
        })
      ),
    };
    const result = await buildChecker(client).check(target);

    expect(result.state).toBe(ServiceState.Operational);
    expect(result.cStat).toBe(107);
    expect(result.latencyMs).toBe(42);
    expect(result.httpStatus).toBe(200);
    expect(result.error).toBeNull();
  });

  it('mapeia erro de parsing (HTML) para ServiceState.Error', async () => {
    const client: SoapClient = {
      post: async (): Promise<SoapResponse> => ({
        status: 403,
        body: loadFixture('html-403.html'),
        latencyMs: 10,
      }),
    };
    const result = await buildChecker(client).check(target);

    expect(result.state).toBe(ServiceState.Error);
    expect(result.cStat).toBeNull();
    expect(result.error).toContain('HTML');
  });

  it('trata exceção de rede (timeout) como Error', async () => {
    const client: SoapClient = {
      post: async () => {
        const err = new Error('aborted') as Error & { code: string };
        err.code = 'ECONNABORTED';
        throw err;
      },
    };
    const result = await buildChecker(client).check(target);

    expect(result.state).toBe(ServiceState.Error);
    expect(result.error).toContain('Timeout');
  });

  it('retorna Error quando o documento não tem builder/parser registrado', async () => {
    const client: SoapClient = { post: vi.fn() };
    const checker = new StatusChecker(
      new Map(),
      new Map(),
      client,
      new StatusClassifier(),
      { now: () => 0 }
    );
    const result = await checker.check(target);

    expect(result.state).toBe(ServiceState.Error);
    expect(client.post).not.toHaveBeenCalled();
  });
});
