interface SparklineProps {
  /** Valores na ordem cronológica. Menos de 2 pontos não desenha nada. */
  values: number[];
  /** Cor do traço e do preenchimento (o gradiente é derivado dela). */
  color: string;
  /** Id único do gradiente no documento. */
  gradientId: string;
}

/** Proporção interna do viewBox. O SVG é escalado pelo container via CSS. */
const W = 100;
const H = 32;

/** Caminho da linha e do preenchimento, normalizados no viewBox. */
function buildPaths(values: number[]): { line: string; area: string } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Série constante (comum: latência estável) desenharia uma reta no topo ou
  // no fundo. Centralizar deixa o traço no meio, que é o que se espera ver.
  const span = max - min || 1;
  const flat = max === min;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = flat ? H / 2 : H - ((v - min) / span) * H;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return { line, area };
}

/**
 * Sparkline em SVG puro.
 *
 * Antes isto era um `AreaChart` do Recharts. Renderizado nos 135 cards, aquilo
 * custava caro duas vezes: o Recharts respondia por 522 KB dos 752 KB do bundle
 * (151 KB dos 223 KB comprimidos) e cada card montava um `ResponsiveContainer`
 * com seu próprio `ResizeObserver`. Para uma linha de ~60 px, um `<path>` faz o
 * mesmo trabalho — e o Recharts fica só no gráfico do painel de detalhe, que é
 * aberto sob demanda e carrega em lazy.
 */
export function Sparkline({ values, color, gradientId }: SparklineProps) {
  if (values.length < 2) return null;
  const { line, area } = buildPaths(values);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        // O viewBox é esticado horizontalmente (preserveAspectRatio="none");
        // sem isto o traço ficaria com espessura distorcida.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
