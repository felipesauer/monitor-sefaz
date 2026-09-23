import { describe, it, expect } from 'vitest';
import { ALL_UFS, REGIONS, UF_INFO } from '../src/uf-info.js';

describe('UF_INFO', () => {
  it('traz a região que o próprio código IBGE indica (primeiro dígito do cUF)', () => {
    for (const uf of ALL_UFS) {
      const { cUF, regiao } = UF_INFO[uf];
      expect(REGIONS[Math.floor(cUF / 10) - 1], uf).toBe(regiao);
    }
  });

  it('distribui as 27 UFs nas 5 regiões', () => {
    const count = (region: string) => ALL_UFS.filter((uf) => UF_INFO[uf].regiao === region).length;
    expect(REGIONS.map(count)).toEqual([7, 9, 4, 3, 4]);
  });
});
