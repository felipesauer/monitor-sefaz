import { DocumentType, type UF } from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';

/** Status por UF de um documento, como exposto pelo IntegraNotas. */
export interface IntegraNotasRow {
  readonly uf: UF;
  readonly state: ServiceState;
  /** "Tempo médio" reportado (segundos); -1 = sem dados. */
  readonly tMedSeconds: number | null;
}

/** Formato cru do JSON do IntegraNotas (`/doc/sefaz/monitor/<doc>`). */
interface IntegraNotasPayload {
  dados?: {
    labels?: string[];
    data?: number[];
    backgroundColor?: string[];
    normal?: number[];
    svc?: (number | null)[];
  };
}

/** Transporte HTTP injetável (axios no Node, fetch no Worker). */
export interface IntegraNotasFetcher {
  (url: string): Promise<string>;
}

/** Resultado de uma busca: as linhas + a latência de REDE medida do fetch. */
export interface IntegraNotasFetchResult {
  readonly rows: IntegraNotasRow[];
  /** Tempo de ida-e-volta da requisição HTTP (ms) — a latência real do documento. */
  readonly fetchLatencyMs: number;
}

const BASE = 'https://integranotas.com.br/doc/sefaz/monitor';

/** Documentos cobertos pelo IntegraNotas que o monitor expõe. */
export const INTEGRANOTAS_DOCUMENTS: Partial<Record<DocumentType, string>> = {
  [DocumentType.NFe]: 'nfe',
  [DocumentType.NFCe]: 'nfce',
  [DocumentType.CTe]: 'cte',
  [DocumentType.MDFe]: 'mdfe',
  [DocumentType.DCe]: 'dce',
};

const VALID_UFS = new Set<string>([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]);

/**
 * Mapeia uma linha do IntegraNotas para um `ServiceState`, seguindo a lógica do
 * monitor público (cor + flags normal/svc):
 * - normal == 1 → Operacional
 * - normal == 0 && svc == 1 → Contingência (operando via SVC)
 * - senão, pela cor: laranja=lentidão e amarela=instável → SlowDown; vermelha → Down
 * - preto / sem dados (tMed -1) → Error
 */
function mapState(normal: number, svc: number | null, color: string, tMed: number): ServiceState {
  if (color.includes('0, 0, 0') || tMed === -1) {
    return ServiceState.Error;
  }
  if (Number(normal) === 1) {
    return ServiceState.Operational;
  }
  if (Number(normal) === 0 && Number(svc) === 1) {
    return ServiceState.Contingency;
  }
  if (color.includes('228, 63, 82')) return ServiceState.Down; // vermelho — parada
  if (color.includes('241, 116, 37') || color.includes('255, 193, 7')) {
    return ServiceState.SlowDown; // laranja (lentidão) / amarelo (instável)
  }
  if (color.includes('47, 85, 212')) return ServiceState.Contingency; // azul
  if (color.includes('46, 202, 139')) return ServiceState.Operational; // verde
  return ServiceState.Error;
}

/**
 * Cliente da API JSON pública de disponibilidade do IntegraNotas.
 *
 * Diferente das páginas oficiais da SEFAZ (que retornam HTML e exigem scraping),
 * o IntegraNotas devolve JSON limpo quando a requisição envia o header
 * `X-Requested-With: XMLHttpRequest`. Cobre os 5 documentos POR UF (medição real
 * por estado, não derivada de autorizador). A latência de rede não é fornecida —
 * `tMedSeconds` é o "tempo médio" da SEFAZ em segundos (ou null).
 */
export class IntegraNotasProvider {
  constructor(
    private readonly fetcher: IntegraNotasFetcher,
    /** Relógio em ms; injetável para os testes serem determinísticos. */
    private readonly now: () => number = () => Date.now()
  ) {}

  public supportedDocuments(): DocumentType[] {
    return Object.keys(INTEGRANOTAS_DOCUMENTS) as DocumentType[];
  }

  public async fetch(document: DocumentType): Promise<IntegraNotasFetchResult> {
    const slug = INTEGRANOTAS_DOCUMENTS[document];
    if (!slug) {
      return { rows: [], fetchLatencyMs: 0 };
    }
    // Cronometra a requisição: esta é a latência de REDE real do documento — a
    // métrica que o front exibe. O tMed do IntegraNotas é tempo médio da SEFAZ
    // em segundos inteiros (grosseiro: 0/1/6s), inútil como latência.
    const start = this.now();
    const body = await this.fetcher(`${BASE}/${slug}`);
    const fetchLatencyMs = this.now() - start;
    const parsed = JSON.parse(body) as IntegraNotasPayload;
    const d = parsed.dados;
    // Os arrays do payload são lidos por índice PARALELO (labels[i], data[i],
    // backgroundColor[i], normal[i], svc[i]). Se qualquer um desalinhar, lemos o
    // estado/flags de OUTRA UF ou caímos em Error silencioso. Por isso exigimos
    // que todos os presentes tenham o mesmo comprimento de labels; senão lança e
    // o HybridCollector pula o documento (e cai no fallback se necessário).
    const n = d?.labels?.length;
    const lenMismatch = (a?: unknown[]): boolean => Array.isArray(a) && a.length !== n;
    if (
      !d?.labels ||
      !Array.isArray(d.backgroundColor) ||
      d.backgroundColor.length !== n ||
      !Array.isArray(d.data) ||
      d.data.length !== n ||
      lenMismatch(d.normal) ||
      lenMismatch(d.svc)
    ) {
      throw new Error('IntegraNotas: payload incompleto ou com arrays desalinhados');
    }

    const rows: IntegraNotasRow[] = [];
    d.labels.forEach((uf, i) => {
      const code = uf.toUpperCase();
      if (!VALID_UFS.has(code)) {
        return;
      }
      const tMed = d.data?.[i] ?? -1;
      const state = mapState(d.normal?.[i] ?? 0, d.svc?.[i] ?? null, d.backgroundColor![i] ?? '', tMed);
      rows.push({
        uf: code as UF,
        state,
        tMedSeconds: tMed >= 0 ? tMed : null,
      });
    });
    return { rows, fetchLatencyMs };
  }
}

export { mapState as mapIntegraNotasState };
