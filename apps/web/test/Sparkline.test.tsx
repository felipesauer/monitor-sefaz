import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from '../src/components/Sparkline.js';

function paths(container: HTMLElement): SVGPathElement[] {
  return [...container.querySelectorAll('path')];
}

describe('Sparkline', () => {
  it('não desenha nada com menos de 2 pontos', () => {
    const { container } = render(<Sparkline values={[10]} color="#0f0" gradientId="g1" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('desenha área e linha', () => {
    const { container } = render(<Sparkline values={[1, 5, 2]} color="#0f0" gradientId="g2" />);
    expect(paths(container)).toHaveLength(2);
  });

  it('centraliza a série constante em vez de colar na borda', () => {
    // Latência estável é o caso comum; uma reta no topo ou no fundo pareceria bug.
    const { container } = render(<Sparkline values={[7, 7, 7]} color="#0f0" gradientId="g3" />);
    const line = paths(container)[1]!.getAttribute('d')!;
    expect(line).toBe('M0.00 16.00 L50.00 16.00 L100.00 16.00');
  });

  it('mapeia o maior valor no topo e o menor na base', () => {
    const { container } = render(<Sparkline values={[0, 100]} color="#0f0" gradientId="g4" />);
    const line = paths(container)[1]!.getAttribute('d')!;
    expect(line).toBe('M0.00 32.00 L100.00 0.00');
  });

  it('fecha o caminho da área na base', () => {
    const { container } = render(<Sparkline values={[1, 2]} color="#0f0" gradientId="g5" />);
    expect(paths(container)[0]!.getAttribute('d')).toMatch(/L100 32 L0 32 Z$/);
  });

  it('usa o gradiente pelo id recebido', () => {
    const { container } = render(
      <Sparkline values={[1, 2]} color="#0f0" gradientId="spark-NFe:SP" />
    );
    expect(container.querySelector('linearGradient')?.id).toBe('spark-NFe:SP');
    expect(paths(container)[0]!.getAttribute('fill')).toBe('url(#spark-NFe:SP)');
  });

  it('é decorativo para leitores de tela', () => {
    const { container } = render(<Sparkline values={[1, 2]} color="#0f0" gradientId="g6" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
