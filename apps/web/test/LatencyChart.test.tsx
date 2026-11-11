import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { LatencyChart } from '../src/components/LatencyChart.js';

const point = (timestamp: string, latencyMs: number): HistoryPointDTO => ({
  timestamp,
  state: 'OPERATIONAL',
  cStat: 107,
  latencyMs,
});

/** Leituras de 5 em 5 minutos a partir de um horário. */
const every5min = (start: string, values: number[]) =>
  values.map((v, i) => point(new Date(Date.parse(start) + i * 5 * 60_000).toISOString(), v));

describe('LatencyChart', () => {
  it('desenha a área e a linha da latência, com os zeros incluídos', () => {
    const { container } = render(
      <LatencyChart points={every5min('2026-11-10T10:00:00Z', [120, 340, 0, 200])} />
    );
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments).toHaveLength(1);
    const line = segments[0]!.querySelectorAll('path')[1]!;
    // 4 pontos: um M e três L.
    expect(line.getAttribute('d')!.match(/[ML]/g)).toHaveLength(4);
  });

  it('quebra a linha num buraco de coleta', () => {
    const points = [
      ...every5min('2026-11-10T10:00:00Z', [100, 110, 120]),
      ...every5min('2026-11-10T13:00:00Z', [130, 140, 150]),
    ];
    const { container } = render(<LatencyChart points={points} />);
    expect(container.querySelectorAll('[data-segment]')).toHaveLength(2);
  });

  it('resume a série para leitor de tela', () => {
    render(<LatencyChart points={every5min('2026-11-10T10:00:00Z', [120, 340, 80])} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(
      /mínima 80 ms, máxima 340 ms, última 80 ms/
    );
  });

  it('mostra o horário e a latência do ponto sob o cursor', () => {
    render(<LatencyChart points={every5min('2026-11-10T10:00:00Z', [120, 340, 80])} />);
    const svg = screen.getByRole('img');
    svg.getBoundingClientRect = () => ({ left: 0, width: 400, top: 0, height: 140 }) as DOMRect;
    fireEvent.pointerMove(svg, { clientX: 400 });
    expect(screen.getByText(/· 80 ms/)).toBeInTheDocument();
    fireEvent.pointerLeave(svg);
    expect(screen.queryByText(/· 80 ms/)).toBeNull();
  });

  it('avisa quando há menos de dois pontos', () => {
    render(<LatencyChart points={[point('2026-11-10T10:00:00Z', 120)]} />);
    expect(screen.getByText('Dados insuficientes para o gráfico de latência.')).toBeInTheDocument();
  });
});
