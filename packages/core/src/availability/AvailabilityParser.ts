import * as cheerio from 'cheerio';
import type { AuthorizerCode } from '@monitor-sefaz/catalog';
import { ServiceState } from '../domain/types.js';

/** Status de um autorizador extraído da página oficial de disponibilidade. */
export interface AvailabilityRow {
  readonly authorizer: AuthorizerCode;
  readonly state: ServiceState;
  /** Tempo médio reportado pela SEFAZ (segundos), quando disponível. */
  readonly tMedSeconds: number | null;
}

/** Mapeia a cor da "bolinha" de status para um `ServiceState`. */
function colorToState(src: string): ServiceState | null {
  if (src.includes('bola_verde')) return ServiceState.Operational;
  if (src.includes('bola_amarela')) return ServiceState.SlowDown;
  if (src.includes('bola_vermelh')) return ServiceState.Down;
  return null;
}

/**
 * Parser da página oficial de disponibilidade da SEFAZ
 * (ex: nfe.fazenda.gov.br/portal/disponibilidade.aspx).
 *
 * Cada linha da tabela é um autorizador; cada coluna, um serviço, com uma
 * imagem `bola_<cor>` indicando o status. Capturamos a coluna "Status Serviço".
 * É a mesma fonte pública usada por monitores como o monitorsefaz.com.br —
 * não exige certificado A1.
 */
export class AvailabilityParser {
  /** Índice (0-based) da coluna "Status Serviço" na tabela. */
  private readonly statusColumnIndex: number;

  constructor(statusColumnIndex = 5) {
    this.statusColumnIndex = statusColumnIndex;
  }

  public parse(html: string): AvailabilityRow[] {
    const $ = cheerio.load(html);
    const rows: AvailabilityRow[] = [];

    $('tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length <= this.statusColumnIndex) {
        return;
      }

      const authorizer = cells.eq(0).text().trim().toUpperCase();
      if (!/^(S[VP]|[A-Z]{2,5})/.test(authorizer) || authorizer.length > 6) {
        return; // linha sem um código de autorizador plausível
      }

      const imgSrc = cells.eq(this.statusColumnIndex).find('img').attr('src') ?? '';
      const state = colorToState(imgSrc);
      if (!state) {
        return; // coluna sem bolinha de status → não é uma linha de dados
      }

      // "Tempo Médio" fica na coluna seguinte à de status, quando numérico.
      const tMedText = cells.eq(this.statusColumnIndex + 1).text().trim();
      const tMedMatch = tMedText.match(/\d+/);

      rows.push({
        authorizer: this.normalizeAuthorizer(authorizer),
        state,
        tMedSeconds: tMedMatch ? Number.parseInt(tMedMatch[0], 10) : null,
      });
    });

    return rows;
  }

  /** Normaliza variações de código (ex: "SVC-AN" → "SVCAN"). */
  private normalizeAuthorizer(raw: string): AuthorizerCode {
    return raw.replace(/[^A-Z]/g, '') as AuthorizerCode;
  }
}
