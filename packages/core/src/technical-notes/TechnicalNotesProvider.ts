import { backoffMs, defaultSleeper, type Sleeper } from '../domain/retry.js';
import { parseTechnicalNotes, type TechnicalNote } from './TechnicalNotesParser.js';

/** URL da lista de Notas Técnicas da NF-e (produção). */
export const TECHNICAL_NOTES_URL =
  'https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=';

/** Transporte HTTP injetável (axios no Node, fetch no Worker); devolve HTML. */
export interface TechnicalNotesFetcher {
  (url: string): Promise<string>;
}

/**
 * Cliente da lista de Notas Técnicas do portal da NF-e. Mesma estratégia das
 * demais fontes ao vivo: transporte injetado + retry com backoff. Se todas as
 * tentativas falharem ou não trouxerem notas, LANÇA (o collector então pula sem
 * publicar uma lista vazia por engano).
 */
export class TechnicalNotesProvider {
  constructor(
    private readonly fetcher: TechnicalNotesFetcher,
    private readonly sleep: Sleeper = defaultSleeper,
    private readonly random: () => number = Math.random
  ) {}

  public async fetch(attempts = 3): Promise<TechnicalNote[]> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const html = await this.fetcher(TECHNICAL_NOTES_URL);
        const notes = parseTechnicalNotes(html);
        if (notes.length > 0) {
          return notes;
        }
        lastError = new Error('lista de notas técnicas vazia');
      } catch (err) {
        lastError = err;
      }
      if (attempt < attempts) {
        await this.sleep(backoffMs(attempt, this.random));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
