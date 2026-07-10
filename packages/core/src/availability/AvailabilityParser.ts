import * as cheerio from 'cheerio';
import { DocumentType, type AuthorizerCode } from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';

/** Status de um autorizador extraído da página oficial de disponibilidade. */
export interface AvailabilityRow {
  readonly authorizer: AuthorizerCode;
  readonly state: ServiceState;
  /** Tempo médio reportado pela SEFAZ (segundos), quando disponível. */
  readonly tMedSeconds: number | null;
}

/**
 * Resultado do parse com diagnóstico de layout. `headerMatched` indica se a coluna
 * de status foi resolvida pelo TEXTO do cabeçalho (robusto a mudança de layout) ou
 * se caímos no índice fixo — um `false` com página não-vazia é indício de DRIFT do
 * HTML da SEFAZ, sinal que o consenso pode transformar em alerta.
 */
export interface AvailabilityParseResult {
  readonly rows: AvailabilityRow[];
  readonly headerMatched: boolean;
}

/**
 * Layout de colunas da tabela de disponibilidade — VARIA por documento.
 * `statusIndex` é a coluna "Status Serviço"; `tMedIndex` é a coluna "Tempo Médio".
 *
 * - NF-e/NFC-e (www.nfe): Autorizador(0) Autorização(1) Retorno(2) Inutilização(3)
 *   Consulta Protocolo(4) **Status Serviço(5)** Tempo Médio(6) ...
 * - CT-e (www.cte): Autorizador(0) Recepção Sinc(1) **Status Serviço(2)** Recepção
 *   CT-e OS(3) Recepção GTVE(4) Recepção Evento(5) Consulta Cadastro(6) Tempo Médio(7)
 *
 * Usar índice fixo 5 para a CT-e lia "Recepção Evento" — bug de fidelidade.
 */
export interface ColumnLayout {
  readonly statusIndex: number;
  readonly tMedIndex: number;
}

export const DOCUMENT_COLUMNS: Record<DocumentType, ColumnLayout> = {
  [DocumentType.NFe]: { statusIndex: 5, tMedIndex: 6 },
  [DocumentType.NFCe]: { statusIndex: 5, tMedIndex: 6 },
  [DocumentType.CTe]: { statusIndex: 2, tMedIndex: 7 },
  // MDF-e/DC-e são derivados do SVRS (sem página própria); layout não aplicável.
  [DocumentType.MDFe]: { statusIndex: 5, tMedIndex: 6 },
  [DocumentType.DCe]: { statusIndex: 5, tMedIndex: 6 },
};

/** Mapeia a cor da "bolinha" de status para um `ServiceState`. */
function colorToState(src: string): ServiceState | null {
  if (src.includes('bola_verde')) return ServiceState.Operational;
  if (src.includes('bola_amarela')) return ServiceState.SlowDown;
  if (src.includes('bola_vermelh')) return ServiceState.Down;
  return null;
}

/** Normaliza texto de cabeçalho: minúsculo, sem acento e sem não-letras. */
function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos
    .replace(/[^a-z]/g, ''); // "Status Serviço4" → "statusservico"
}

/**
 * Descobre os índices das colunas "Status Serviço" e "Tempo Médio" pelo TEXTO do
 * cabeçalho (`<th>`), tolerante a inserção/remoção de colunas pela SEFAZ. Retorna
 * `null` quando o cabeçalho não casa (aí o chamador usa o índice fixo como
 * fallback e sinaliza que o layout pode ter mudado).
 */
function findColumnsByHeader(
  headerCells: string[]
): { statusIndex: number; tMedIndex: number } | null {
  const norm = headerCells.map(normalizeHeader);
  // Casa por âncoras ASCII estáveis ("status", "tempo") em vez do texto completo:
  // a página vem em latin-1 e "Serviço"/"Médio" chegam como mojibake ("serviao"),
  // mas "Status" e "Tempo" não têm acento e sobrevivem à decodificação.
  const statusIndex = norm.findIndex((h) => h.includes('status'));
  const tMedIndex = norm.findIndex((h) => h.includes('tempo'));
  if (statusIndex < 0) {
    return null; // sem a coluna-chave, não confiamos no cabeçalho
  }
  // tMed pode não existir em alguns layouts; -1 é aceitável (vira null no parse).
  return { statusIndex, tMedIndex };
}

function normalizeAuthorizer(raw: string): AuthorizerCode {
  return raw.replace(/[^A-Z]/g, '') as AuthorizerCode;
}

/**
 * Parser da página oficial de disponibilidade da SEFAZ
 * (ex: nfe.fazenda.gov.br/portal/disponibilidade.aspx).
 *
 * Cada linha da tabela é um autorizador; cada coluna, um serviço, com uma
 * imagem `bola_<cor>` indicando o status. Lê a coluna "Status Serviço" conforme
 * o layout do documento (`ColumnLayout`). É a mesma fonte pública usada por
 * monitores como o monitorsefaz.com.br — não exige certificado A1.
 */
export class AvailabilityParser {
  private readonly layout: ColumnLayout;

  /**
   * @param layout colunas do documento. Aceita um `ColumnLayout` explícito, um
   * `DocumentType` (resolve via `DOCUMENT_COLUMNS`), ou — por compatibilidade —
   * um índice numérico de status. Padrão: layout NF-e.
   */
  constructor(layout: ColumnLayout | DocumentType | number = DocumentType.NFe) {
    if (typeof layout === 'number') {
      this.layout = { statusIndex: layout, tMedIndex: layout + 1 };
    } else if (typeof layout === 'string') {
      this.layout = DOCUMENT_COLUMNS[layout];
    } else {
      this.layout = layout;
    }
  }

  public parse(html: string): AvailabilityRow[] {
    return this.parseWithDiagnostics(html).rows;
  }

  /**
   * Como `parse`, mas informa se a coluna de status foi resolvida pelo cabeçalho
   * (`headerMatched: true`) ou pelo índice fixo de fallback. Prefere SEMPRE o
   * cabeçalho — casar "Status Serviço"/"Tempo Médio" pelo texto sobrevive à
   * SEFAZ inserir/remover colunas; o índice fixo só entra quando o cabeçalho não
   * casa, e nesse caso `headerMatched: false` sinaliza possível drift.
   */
  public parseWithDiagnostics(html: string): AvailabilityParseResult {
    const $ = cheerio.load(html);

    // Tenta resolver as colunas pelo cabeçalho da PRIMEIRA linha que tem <th>.
    let resolved: { statusIndex: number; tMedIndex: number } | null = null;
    $('tr').each((_, tr) => {
      if (resolved) return;
      const ths = $(tr).find('th');
      if (ths.length > 2) {
        const headers = ths.map((_i, th) => $(th).text()).get();
        resolved = findColumnsByHeader(headers);
      }
    });

    const headerMatched = resolved !== null;
    const { statusIndex, tMedIndex } = resolved ?? this.layout;
    const rows: AvailabilityRow[] = [];

    $('tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length <= statusIndex) {
        return;
      }

      const authorizer = cells.eq(0).text().trim().toUpperCase();
      if (!/^(S[VP]|[A-Z]{2,5})/.test(authorizer) || authorizer.length > 6) {
        return; // linha sem um código de autorizador plausível
      }

      const imgSrc = cells.eq(statusIndex).find('img').attr('src') ?? '';
      const state = colorToState(imgSrc);
      if (!state) {
        return; // coluna sem bolinha de status → não é uma linha de dados
      }

      // tMedIndex pode ser -1 (cabeçalho sem "Tempo Médio"): eq(-1) não casa,
      // texto vazio → tMedSeconds null. Comportamento correto, sem exceção.
      const tMedText = tMedIndex >= 0 ? cells.eq(tMedIndex).text().trim() : '';
      const tMedMatch = tMedText.match(/\d+/);

      rows.push({
        authorizer: normalizeAuthorizer(authorizer),
        state,
        tMedSeconds: tMedMatch ? Number.parseInt(tMedMatch[0], 10) : null,
      });
    });

    return { rows, headerMatched };
  }
}
