import { describe, it, expect } from 'vitest';
import { StatusClassifier } from '../../src/checker/StatusClassifier.js';
import { ServiceState } from '../../src/domain/types.js';

describe('StatusClassifier', () => {
  const classifier = new StatusClassifier();

  it('classifica 107 como Operational', () => {
    expect(classifier.classify(107, false)).toBe(ServiceState.Operational);
  });

  it('classifica 108 como SlowDown', () => {
    expect(classifier.classify(108, false)).toBe(ServiceState.SlowDown);
  });

  it('classifica 109 como Down', () => {
    expect(classifier.classify(109, false)).toBe(ServiceState.Down);
  });

  it('classifica cStat desconhecido como Error', () => {
    expect(classifier.classify(999, false)).toBe(ServiceState.Error);
  });

  it('classifica falha de transporte como Error mesmo com cStat válido', () => {
    expect(classifier.classify(107, true)).toBe(ServiceState.Error);
  });

  it('classifica cStat nulo como Error', () => {
    expect(classifier.classify(null, false)).toBe(ServiceState.Error);
  });
});
