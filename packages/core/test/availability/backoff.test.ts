import { describe, it, expect } from 'vitest';
import { backoffMs } from '../../src/availability/AvailabilityProvider.js';

describe('backoffMs', () => {
  it('é linear na tentativa (base 500ms × attempt) sem jitter', () => {
    const noJitter = () => 0.5; // 0.8 + 0.5*0.4 = 1.0 → sem desvio
    expect(backoffMs(1, noJitter)).toBe(500);
    expect(backoffMs(2, noJitter)).toBe(1000);
    expect(backoffMs(3, noJitter)).toBe(1500);
  });

  it('aplica jitter de ±20% nos extremos de random', () => {
    expect(backoffMs(1, () => 0)).toBe(400); // 500 * 0.8
    expect(backoffMs(1, () => 0.999999)).toBe(600); // 500 * ~1.2
  });

  it('é determinístico com random injetado', () => {
    const r = () => 0.25;
    expect(backoffMs(2, r)).toBe(backoffMs(2, r));
  });
});
