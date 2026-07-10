import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { TechnicalNoteDTO } from '@monitor-sefaz/contracts';
import { TechnicalNotesCard } from '../src/components/TechnicalNotesCard.js';

const note = (title: string, link: string | null = null): TechnicalNoteDTO => ({
  title,
  link,
  firstSeenAt: '2026-07-10T00:00:00.000Z',
});

describe('TechnicalNotesCard', () => {
  it('não renderiza nada quando não há notas', () => {
    const { container } = render(<TechnicalNotesCard notes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o título e a contagem', () => {
    render(<TechnicalNotesCard notes={[note('NT 2024.001'), note('NT 2023.004')]} />);
    expect(screen.getByText('Notas Técnicas (2)')).toBeInTheDocument();
    expect(screen.getByText('NT 2024.001')).toBeInTheDocument();
  });

  it('nota com link vira âncora (target=_blank); sem link vira texto', () => {
    render(<TechnicalNotesCard notes={[note('Com link', 'https://x/nt'), note('Sem link', null)]} />);
    const anchor = screen.getByText('Com link').closest('a');
    expect(anchor).toHaveAttribute('href', 'https://x/nt');
    expect(anchor).toHaveAttribute('target', '_blank');
    // "Sem link" não é âncora
    expect(screen.getByText('Sem link').closest('a')).toBeNull();
  });

  it('colapsa: mostra só previewCount até expandir', () => {
    const notes = Array.from({ length: 8 }, (_, i) => note(`NT-${i}`));
    render(<TechnicalNotesCard notes={notes} previewCount={3} />);
    // colapsado: 3 visíveis, NT-3 ainda não
    expect(screen.getByText('NT-2')).toBeInTheDocument();
    expect(screen.queryByText('NT-5')).not.toBeInTheDocument();
    // expande
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('NT-5')).toBeInTheDocument();
  });
});
