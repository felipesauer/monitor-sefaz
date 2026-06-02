import type { DocumentType } from '@monitor-sefaz/catalog';
import { ServiceState, type ServiceTarget, type StatusResult } from '../domain/types.js';
import type { EnvelopeBuilder } from '../envelopes/EnvelopeBuilder.js';
import type { ResponseParser } from '../parsers/ResponseParser.js';
import type { SoapClient } from './SoapClient.js';
import type { StatusClassifier } from './StatusClassifier.js';

export interface StatusCheckerOptions {
  /** Timeout por requisição. Padrão 15s (igual ao protótipo). */
  readonly timeoutMs?: number;
  /** Função de tempo, injetável para testes. */
  readonly now?: () => number;
}

/**
 * Orquestra uma consulta de status: seleciona o builder/parser do documento,
 * dispara a requisição, classifica o resultado e normaliza erros em
 * `ServiceState.Error`. Depende apenas de interfaces (DIP) → testável com mocks.
 */
export class StatusChecker {
  private readonly timeoutMs: number;
  private readonly now: () => number;

  constructor(
    private readonly builders: ReadonlyMap<DocumentType, EnvelopeBuilder>,
    private readonly parsers: ReadonlyMap<DocumentType, ResponseParser>,
    private readonly client: SoapClient,
    private readonly classifier: StatusClassifier,
    options: StatusCheckerOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.now = options.now ?? (() => Date.now());
  }

  public async check(target: ServiceTarget): Promise<StatusResult> {
    const builder = this.builders.get(target.document);
    const parser = this.parsers.get(target.document);
    if (!builder || !parser) {
      return this.errorResult(target, 0, `Documento não suportado: ${target.document}`, null);
    }

    const envelope = builder.build({ cUF: target.cUF, environment: target.environment });
    const start = this.now();

    try {
      const response = await this.client.post(target.url, envelope, {
        timeoutMs: this.timeoutMs,
      });
      const latencyMs = response.latencyMs;

      if (!response.body) {
        return this.errorResult(
          target,
          latencyMs,
          `Resposta vazia (HTTP ${response.status})`,
          response.status
        );
      }

      const parsed = parser.parse(response.body);
      const state = this.classifier.classify(parsed.cStat, false);

      return {
        target,
        state,
        cStat: parsed.cStat,
        xMotivo: parsed.xMotivo,
        latencyMs,
        dhRecbto: parsed.dhRecbto,
        tMed: parsed.tMed,
        httpStatus: response.status,
        error: null,
        checkedAt: new Date(this.now()),
      };
    } catch (err) {
      const latencyMs = this.now() - start;
      return this.errorResult(target, latencyMs, this.describeError(err), null);
    }
  }

  private describeError(err: unknown): string {
    const code = (err as { code?: string } | null)?.code;
    switch (code) {
      case 'ECONNABORTED':
        return `Timeout após ${this.timeoutMs / 1000}s`;
      case 'ECONNREFUSED':
        return 'Conexão recusada';
      case 'ENOTFOUND':
        return 'Host não encontrado';
      default:
        return err instanceof Error ? err.message.slice(0, 120) : 'Erro desconhecido';
    }
  }

  private errorResult(
    target: ServiceTarget,
    latencyMs: number,
    error: string,
    httpStatus: number | null
  ): StatusResult {
    return {
      target,
      state: ServiceState.Error,
      cStat: null,
      xMotivo: null,
      latencyMs,
      dhRecbto: null,
      tMed: null,
      httpStatus,
      error,
      checkedAt: new Date(this.now()),
    };
  }
}
