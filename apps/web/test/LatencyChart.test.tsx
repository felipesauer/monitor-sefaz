import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { HistoryPointDTO } from '@monitor-sefaz/contracts';
import { LatencyChart } from '../src/components/LatencyChart.js';

/**
 * O jsdom não tem layout: o `ResponsiveContainer` do Recharts mede 0×0 e não
 * desenha nada. Este ResizeObserver devolve um tamanho fixo na observação, que
 * é o que o container espera de um navegador de verdade.
 */
class FixedSizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  public observe(target: Element): void {
    const entry = { target, contentRect: { width: 400, height: 160 } } as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
  public unobserve(): void {}
  public disconnect(): void {}
}

const point = (timestamp: string, latencyMs: number): HistoryPointDTO => ({
  timestamp,
  state: 'OPERATIONAL',
  cStat: 107,
  latencyMs,
});

describe('LatencyChart', () => {
  beforeEach(() => vi.stubGlobal('ResizeObserver', FixedSizeObserver));
  afterEach(() => vi.unstubAllGlobals());

  it('desenha a área da latência com os pontos do histórico', () => {
    const { container } = render(
      <LatencyChart
        points={[
          point('2026-11-10T10:00:00Z', 120),
          point('2026-11-10T11:00:00Z', 340),
          point('2026-11-10T12:00:00Z', 0),
        ]}
      />
    );

    const area = container.querySelector('.recharts-area-area');
    expect(area?.getAttribute('d')?.length ?? 0).toBeGreaterThan(10);
    expect(container.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick').length).toBe(
      3
    );
  });

  it('avisa quando há menos de dois pontos', () => {
    render(<LatencyChart points={[point('2026-11-10T10:00:00Z', 120)]} />);

    expect(screen.getByText('Dados insuficientes para o gráfico de latência.')).toBeInTheDocument();
  });
});
