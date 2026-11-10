import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../src/components/Footer.js';

describe('Footer', () => {
  it('desenha a marca do GitHub no link do repositório', () => {
    render(<Footer />);

    const link = screen.getByRole('link', { name: 'Código no GitHub' });
    expect(link).toHaveAttribute('href', 'https://github.com/felipesauer/monitor-sefaz');
    const mark = link.querySelector('svg');
    expect(mark).not.toBeNull();
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark?.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });
});
