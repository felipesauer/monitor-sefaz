import { useState } from 'react';
import { ChevronDown, FileText, ExternalLink } from 'lucide-react';
import type { TechnicalNoteDTO } from '@monitor-sefaz/contracts';

interface Props {
  notes: TechnicalNoteDTO[];
  /** Quantas notas mostrar colapsado antes de "ver todas". */
  readonly previewCount?: number;
}

/**
 * Seção colapsável com as Notas Técnicas publicadas no portal da NF-e. Prop-driven
 * (a página injeta os dados do hook) para ser trivial de testar. Não renderiza
 * nada quando não há notas — a seção só aparece quando há conteúdo.
 */
export function TechnicalNotesCard({ notes, previewCount = 5 }: Props) {
  const [open, setOpen] = useState(false);

  if (notes.length === 0) {
    return null;
  }

  // Colapsado mostra as `previewCount` mais recentes (a coleta preserva a ordem
  // do portal, mais novas primeiro); aberto mostra todas.
  const visible = open ? notes : notes.slice(0, previewCount);

  return (
    <section
      className="rounded-xl border"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Notas Técnicas ({notes.length})
        </span>
        {notes.length > previewCount && (
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }}
          />
        )}
      </button>

      <ul className="flex flex-col gap-3 border-t px-4 py-4">
        {visible.map((note) => (
          <li key={`${note.title}|${note.link ?? ''}`} className="text-sm leading-relaxed">
            {note.link ? (
              <a
                href={note.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {note.title}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span>{note.title}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
