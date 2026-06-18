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
    const $ = cheerio.load(html);
    const rows: AvailabilityRow[] = [];
    const { statusIndex, tMedIndex } = this.layout;

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

      const tMedText = cells.eq(tMedIndex).text().trim();
      const tMedMatch = tMedText.match(/\d+/);

      rows.push({
        authorizer: normalizeAuthorizer(authorizer),
        state,
        tMedSeconds: tMedMatch ? Number.parseInt(tMedMatch[0], 10) : null,
      });
    });

    return rows;
  }
}
