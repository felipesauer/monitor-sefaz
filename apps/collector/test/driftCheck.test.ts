import { describe, it, expect } from 'vitest';
import type { SourceHealth } from '@monitor-sefaz/core';
import { evaluateDrift } from '../src/driftCheck.js';

const src = (
  source: string,
  official: boolean,
  degraded: boolean
): SourceHealth => ({
  source,
  official,
  collected: degraded ? 3 : 130,
  expected: 135,
  coverage: degraded ? 0.022 : 0.963,
  degraded,
});

describe('evaluateDrift', () => {
  it('sem drift quando todas as fontes oficiais estão acima do piso', () => {
    const r = evaluateDrift([
      src('svrs', true, false),
      src('availability', true, false),
      src('integranotas', false, false),
    ]);
    expect(r.drift).toBe(false);
    expect(r.degradedOfficial).toEqual([]);
  });

  it('drift quando uma fonte OFICIAL não-isenta (svrs) está degradada', () => {
    const r = evaluateDrift([
      src('svrs', true, true), // SVRS degradada → drift real (não está na allowlist)
      src('integranotas', false, false),
    ]);
    expect(r.drift).toBe(true);
    expect(r.degradedOfficial).toEqual(['svrs']);
  });

  it('availability degradada NÃO conta como drift (bloqueio de IP conhecido)', () => {
    const r = evaluateDrift([
      src('svrs', true, false),
      src('availability', true, true), // inalcançável do Actions — ignorada por padrão
      src('integranotas', false, false),
    ]);
    expect(r.drift).toBe(false);
    expect(r.degradedOfficial).toEqual([]);
  });

  it('terceiro (não-oficial) degradado NÃO conta como drift', () => {
    const r = evaluateDrift([
      src('svrs', true, false),
      src('integranotas', false, true),
    ]);
    expect(r.drift).toBe(false);
    expect(r.degradedOfficial).toEqual([]);
  });

  it('a allowlist é configurável (vazia = availability volta a contar)', () => {
    const r = evaluateDrift([src('availability', true, true)], new Set());
    expect(r.drift).toBe(true);
    expect(r.degradedOfficial).toEqual(['availability']);
  });

  it('linha da fonte ignorada é marcada como inalcançável', () => {
    const r = evaluateDrift([src('svrs', true, false), src('availability', true, true)]);
    expect(r.lines[0]).toContain('[oficial] svrs');
    expect(r.lines[1]).toContain('inalcançável — ignorada');
  });
});
