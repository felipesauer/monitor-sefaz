import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SvrsParser } from '../../src/svrs/SvrsParser.js';
import { ServiceState } from '../../src/domain/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): string =>
  readFileSync(resolve(here, '../fixtures/svrs', name), 'latin1');

describe('SvrsParser', () => {
  it('extrai SEFAZ-RS e SVRS da página de NF-e (duas seções)', () => {
    const rows = new SvrsParser().parse(fixture('nfe-disponibilidade.html'));
    const authorizers = rows.map((r) => r.authorizer).sort();
    expect(authorizers).toEqual(['SEFAZ-RS', 'SVRS']);

    for (const row of rows) {
      expect(row.webServices.length).toBeGreaterThan(0);
      // O snapshot foi capturado com os serviços normais (cStat 1xx/2xx/5xx).
      expect(row.state).toBe(ServiceState.Operational);
      expect(row.cStat).not.toBeNull();
      expect(row.lastCheckTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    }
  });

  it('extrai o autorizador único da página de CT-e (sem <h4>)', () => {
    const rows = new SvrsParser().parse(fixture('cte-disponibilidade.html'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.authorizer).toBe('SVRS');
    expect(rows[0]!.webServices.length).toBeGreaterThan(0);
    expect(rows[0]!.cStat).not.toBeNull();
  });

  it('extrai o autorizador único da página de MDF-e', () => {
    const rows = new SvrsParser().parse(fixture('mdfe-disponibilidade.html'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.authorizer).toBe('SVRS');
    expect(rows[0]!.webServices.length).toBeGreaterThan(0);
  });

  it('devolve [] para HTML sem tabela de webservices', () => {
    expect(new SvrsParser().parse('<html><body>nada</body></html>')).toEqual([]);
  });
});
