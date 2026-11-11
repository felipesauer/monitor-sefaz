// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Contraste dos tokens de texto (WCAG AA, 4,5:1) lido direto do styles.css: o
 * Lighthouse apontou o --text-dim e o accent como texto abaixo do mínimo, e um
 * ajuste de cor futuro não deve trazer isso de volta sem ninguém ver.
 */
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

type Oklch = [number, number, number];

/** Os tokens `--nome: oklch(L C h)` de um bloco do CSS, resolvendo `var(--x)` no bloco ou em `known`. */
function tokens(selector: string, known: Record<string, Oklch> = {}): Record<string, Oklch> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloco ${selector} não encontrado`);
  const block = css.slice(start, css.indexOf('}', start));
  const out: Record<string, Oklch> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/g)) {
    out[m[1]!] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  for (const m of block.matchAll(/--([\w-]+):\s*var\(--([\w-]+)\)/g)) {
    const ref = out[m[2]!] ?? known[m[2]!];
    if (ref) out[m[1]!] = ref;
  }
  return out;
}

/** OKLCH → luminância relativa (sRGB linear, como o WCAG define). */
function luminance([L, C, h]: Oklch): number {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(fg: Oklch, bg: Oklch): number {
  const [x, y] = [luminance(fg), luminance(bg)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const theme = tokens('@theme');
const base = { ...theme, ...tokens(':root', theme) };
const themes = { claro: base, escuro: { ...base, ...tokens(':root.dark', base) } };

describe('contraste dos tokens de texto', () => {
  for (const [name, t] of Object.entries(themes)) {
    for (const fg of ['text-dim', 'link']) {
      for (const bg of ['surface', 'surface-2', 'bg']) {
        it(`--${fg} sobre --${bg} passa de 4,5:1 no tema ${name}`, () => {
          expect(t[fg], `--${fg}`).toBeDefined();
          expect(t[bg], `--${bg}`).toBeDefined();
          expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }
});
