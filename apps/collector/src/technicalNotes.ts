import {
  type NotificationEventDTO,
  type TechnicalNoteDTO,
  type TechnicalNotesFileDTO,
} from '@monitor-sefaz/contracts';
import type { TechnicalNote } from '@monitor-sefaz/core';

/** Chave de identidade de uma NT (título + link) para dedup entre coletas. */
function noteKey(n: { title: string; link: string | null }): string {
  return `${n.title}|${n.link ?? ''}`;
}

/** Resultado do reconcile: arquivo atualizado + as NTs realmente novas. */
export interface TechnicalNotesDiff {
  readonly file: TechnicalNotesFileDTO;
  readonly fresh: TechnicalNoteDTO[];
}

/**
 * Reconcilia as notas raspadas com as já conhecidas: retorna o arquivo atualizado
 * (conhecidas + novas, preservando o `firstSeenAt` das antigas) e a lista das NTs
 * que são NOVAS nesta coleta — a base do evento TECHNICAL_NOTE. Função pura.
 */
export function reconcileTechnicalNotes(
  known: TechnicalNotesFileDTO,
  scraped: readonly TechnicalNote[],
  now: string
): TechnicalNotesDiff {
  const knownByKey = new Map(known.notes.map((n) => [noteKey(n), n]));
  const fresh: TechnicalNoteDTO[] = [];

  for (const s of scraped) {
    if (!knownByKey.has(noteKey(s))) {
      const dto: TechnicalNoteDTO = { title: s.title, link: s.link, firstSeenAt: now };
      knownByKey.set(noteKey(s), dto);
      fresh.push(dto);
    }
  }

  return {
    file: { updatedAt: now, notes: [...knownByKey.values()] },
    fresh,
  };
}

/** Traduz as NTs novas em eventos de notificação TECHNICAL_NOTE. */
export function technicalNoteEvents(
  fresh: readonly TechnicalNoteDTO[],
  occurredAt: string
): NotificationEventDTO[] {
  return fresh.map((n) => ({
    type: 'TECHNICAL_NOTE' as const,
    occurredAt,
    payload: { title: n.title, link: n.link },
  }));
}
