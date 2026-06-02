import https from 'node:https';
import axios, { type AxiosInstance } from 'axios';

/** Resposta crua de uma requisição SOAP, com latência medida. */
export interface SoapResponse {
  readonly status: number;
  readonly body: string;
  readonly latencyMs: number;
}

export interface SoapRequestOptions {
  readonly timeoutMs: number;
}

/** Abstração de transporte SOAP (permite mockar a rede nos testes — DIP). */
export interface SoapClient {
  post(url: string, body: string, options: SoapRequestOptions): Promise<SoapResponse>;
}

export interface AxiosSoapClientOptions {
  /**
   * Aceita cadeias de certificado incompletas (necessário para algumas SEFAZ).
   * Em produção com certificado A1, prefira `false` + cadeia confiável.
   */
  readonly rejectUnauthorized?: boolean;
  /** Função de tempo, injetável para testes determinísticos. */
  readonly now?: () => number;
}

/**
 * Implementação de `SoapClient` sobre axios. Espelha as decisões do protótipo:
 * `keepAlive`, `rejectUnauthorized:false`, `validateStatus:()=>true` (HTTP 500
 * da SEFAZ ainda pode trazer XML útil) e medição de latência.
 */
export class AxiosSoapClient implements SoapClient {
  private readonly http: AxiosInstance;
  private readonly now: () => number;

  constructor(options: AxiosSoapClientOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    const httpsAgent = new https.Agent({
      rejectUnauthorized: options.rejectUnauthorized ?? false,
      keepAlive: true,
    });
    this.http = axios.create({
      httpsAgent,
      validateStatus: () => true,
      headers: {
        'Content-Type': 'application/soap+xml; charset=UTF-8',
        SOAPAction: '',
        Accept: 'text/xml, application/soap+xml',
      },
    });
  }

  public async post(
    url: string,
    body: string,
    options: SoapRequestOptions
  ): Promise<SoapResponse> {
    const start = this.now();
    const response = await this.http.post(url, body, { timeout: options.timeoutMs });
    const latencyMs = this.now() - start;
    return {
      status: response.status,
      body: typeof response.data === 'string' ? response.data : String(response.data ?? ''),
      latencyMs,
    };
  }
}
