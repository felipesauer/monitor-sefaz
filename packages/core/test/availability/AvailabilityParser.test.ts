import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AvailabilityParser } from '../../src/availability/AvailabilityParser.js';
import { ServiceState } from '../../src/domain/types.js';

const here = dirname(fileURLToPath(import.meta.url));

function loadAvailability(name: string): string {
  return readFileSync(join(here, '..', 'fixtures', 'availability', name), 'latin1');
}

describe('AvailabilityParser', () => {
  const parser = new AvailabilityParser();

  it('extrai os autorizadores da página real de NF-e', () => {
    const rows = parser.parse(loadAvailability('nfe-disponibilidade.html'));
    const codes = rows.map((r) => r.authorizer);
    // autorizadores estaduais e virtuais que aparecem na tabela oficial
    expect(codes).toContain('SP');
    expect(codes).toContain('SVRS');
    expect(codes).toContain('SVAN');
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it('mapeia a cor da bolinha para ServiceState', () => {
    const rows = parser.parse(loadAvailability('nfe-disponibilidade.html'));
    const sp = rows.find((r) => r.authorizer === 'SP');
    expect(sp?.state).toBe(ServiceState.Operational); // SP estava verde na captura
    // todo estado deve ser um ServiceState válido (não há nulos)
    for (const row of rows) {
      expect([
        ServiceState.Operational,
        ServiceState.SlowDown,
        ServiceState.Down,
      ]).toContain(row.state);
    }
  });

  it('extrai os autorizadores da página real de CT-e', () => {
    const rows = parser.parse(loadAvailability('cte-disponibilidade.html'));
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.map((r) => r.authorizer)).toContain('SVRS');
  });

  it('ignora HTML sem tabela de status', () => {
    expect(parser.parse('<html><body><p>sem tabela</p></body></html>')).toEqual([]);
  });
});
