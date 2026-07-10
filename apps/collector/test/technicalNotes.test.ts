import { describe, it, expect } from 'vitest';
import type { TechnicalNotesFileDTO } from '@monitor-sefaz/contracts';
import type { TechnicalNote } from '@monitor-sefaz/core';
import { reconcileTechnicalNotes, technicalNoteEvents } from '../src/technicalNotes.js';

const AT = '2026-07-10T00:00:00.000Z';
const LATER = '2026-07-11T00:00:00.000Z';

const note = (title: string, link: string | null = null): TechnicalNote => ({ title, link });

describe('reconcileTechnicalNotes', () => {
  it('primeira coleta: todas as notas são novas', () => {
    const empty: TechnicalNotesFileDTO = { updatedAt: AT, notes: [] };
    const { file, fresh } = reconcileTechnicalNotes(empty, [note('NT-1'), note('NT-2')], AT);
    expect(fresh).toHaveLength(2);
    expect(file.notes).toHaveLength(2);
    expect(file.notes[0]!.firstSeenAt).toBe(AT);
  });

  it('coleta seguinte: só a NT inédita é nova, e preserva firstSeenAt das antigas', () => {
    const known: TechnicalNotesFileDTO = {
      updatedAt: AT,
      notes: [{ title: 'NT-1', link: null, firstSeenAt: AT }],
    };
    const { file, fresh } = reconcileTechnicalNotes(known, [note('NT-1'), note('NT-2')], LATER);
    expect(fresh.map((n) => n.title)).toEqual(['NT-2']);
    expect(file.notes).toHaveLength(2);
    // a NT-1 mantém o firstSeenAt original
    expect(file.notes.find((n) => n.title === 'NT-1')!.firstSeenAt).toBe(AT);
    expect(file.notes.find((n) => n.title === 'NT-2')!.firstSeenAt).toBe(LATER);
  });

  it('distingue notas de mesmo título mas link diferente', () => {
    const known: TechnicalNotesFileDTO = {
      updatedAt: AT,
      notes: [{ title: 'NT', link: 'a', firstSeenAt: AT }],
    };
    const { fresh } = reconcileTechnicalNotes(known, [note('NT', 'a'), note('NT', 'b')], LATER);
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.link).toBe('b');
  });

  it('nenhuma NT nova quando nada mudou', () => {
    const known: TechnicalNotesFileDTO = {
      updatedAt: AT,
      notes: [{ title: 'NT-1', link: null, firstSeenAt: AT }],
    };
    const { fresh } = reconcileTechnicalNotes(known, [note('NT-1')], LATER);
    expect(fresh).toEqual([]);
  });
});

describe('technicalNoteEvents', () => {
  it('gera um evento TECHNICAL_NOTE por NT nova com título/link no payload', () => {
    const events = technicalNoteEvents(
      [{ title: 'NT-9', link: 'http://x', firstSeenAt: AT }],
      AT
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'TECHNICAL_NOTE',
      occurredAt: AT,
      payload: { title: 'NT-9', link: 'http://x' },
    });
  });
});
