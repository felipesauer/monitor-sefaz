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

type Rgb = [number, number, number];

/** OKLCH → sRGB linear. */
function linear([L, C, h]: Oklch): Rgb {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function ratio(fg: Rgb, bg: Rgb): number {
  const [x, y] = [luminance(fg), luminance(bg)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const contrast = (fg: Oklch, bg: Oklch) => ratio(linear(fg), linear(bg));

/** `color-mix(in oklch, a t, b)`: matiz pelo arco mais curto. */
function mixOklch(a: Oklch, b: Oklch, t: number): Oklch {
  let dh = b[2] - a[2];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [a[0] * t + b[0] * (1 - t), a[1] * t + b[1] * (1 - t), (a[2] + dh * (1 - t) + 360) % 360];
}

/** `color-mix(in srgb, a t, b)`: mistura no sRGB com gama, como o navegador. */
function mixSrgb(a: Rgb, b: Rgb, t: number): Rgb {
  const enc = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  const dec = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return a.map((v, i) => dec(enc(v) * t + enc(b[i]!) * (1 - t))) as Rgb;
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

describe('contraste do texto dos estados (selo do card, StatusBadge)', () => {
  // stateTextColor: metade da cor do estado, metade do --text, sobre o fundo do
  // selo, que é a cor do estado a 14% sobre a superfície.
  for (const [name, t] of Object.entries(themes)) {
    for (const state of ['ok', 'slow', 'down', 'err', 'contingency']) {
      it(`--${state} como texto passa de 4,5:1 sobre o selo no tema ${name}`, () => {
        const color = t[state]!;
        const fg = linear(mixOklch(color, t['text']!, 0.5));
        const bg = mixSrgb(linear(color), linear(t['surface']!), 0.14);
        expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
