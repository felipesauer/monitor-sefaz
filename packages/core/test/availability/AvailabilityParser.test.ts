import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AvailabilityParser } from '../../src/availability/AvailabilityParser.js';
import { ServiceState } from '../../src/domain/types.js';
import { DocumentType } from '@monitor-sefaz/catalog';

const here = dirname(fileURLToPath(import.meta.url));

function loadAvailability(name: string): string {
  return readFileSync(join(here, '..', 'fixtures', 'availability', name), 'latin1');
}

describe('AvailabilityParser', () => {
  const parser = new AvailabilityParser(DocumentType.NFe);

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

  it('extrai os autorizadores da página real de CT-e usando o layout da CT-e', () => {
    const cteParser = new AvailabilityParser(DocumentType.CTe);
    const rows = cteParser.parse(loadAvailability('cte-disponibilidade.html'));
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.map((r) => r.authorizer)).toContain('SVRS');
    // Com o layout correto (coluna 2), todo estado é válido.
    for (const row of rows) {
      expect([
        ServiceState.Operational,
        ServiceState.SlowDown,
        ServiceState.Down,
      ]).toContain(row.state);
    }
  });

  it('lê a coluna "Status Serviço" da CT-e (índice 2), não "Recepção Evento" (índice 5)', () => {
    // Regressão do bug de fidelidade: a CT-e tem layout diferente da NF-e.
    // Provamos que o layout importa — ler a CT-e com o índice da NF-e (5) lê
    // outra coluna. Construímos uma linha onde a coluna 2 e a 5 divergem.
    const html = `<table><tr>
      <td>SVRS</td>
      <td><img src="bola_verde.png"></td>
      <td><img src="bola_vermelho.png"></td>
      <td><img src="bola_verde.png"></td>
      <td><img src="bola_verde.png"></td>
      <td><img src="bola_verde.png"></td>
      <td>3</td>
      <td>5</td>
    </tr></table>`;
    const cte = new AvailabilityParser(DocumentType.CTe).parse(html);
    const nfeLayout = new AvailabilityParser(DocumentType.NFe).parse(html);
    expect(cte[0]?.state).toBe(ServiceState.Down); // coluna 2 (Status Serviço CT-e)
    expect(nfeLayout[0]?.state).toBe(ServiceState.Operational); // coluna 5 (errado p/ CT-e)
    // tMed da CT-e vem da coluna 7 (=5), não da 6.
    expect(cte[0]?.tMedSeconds).toBe(5);
  });

  it('ignora HTML sem tabela de status', () => {
    expect(parser.parse('<html><body><p>sem tabela</p></body></html>')).toEqual([]);
  });

  describe('resolução por cabeçalho (defensivo a mudança de layout)', () => {
    it('nas páginas reais, resolve as colunas pelo cabeçalho (headerMatched)', () => {
      const nfe = new AvailabilityParser(DocumentType.NFe).parseWithDiagnostics(
        loadAvailability('nfe-disponibilidade.html')
      );
      const cte = new AvailabilityParser(DocumentType.CTe).parseWithDiagnostics(
        loadAvailability('cte-disponibilidade.html')
      );
      expect(nfe.headerMatched).toBe(true);
      expect(cte.headerMatched).toBe(true);
      expect(nfe.rows.length).toBeGreaterThanOrEqual(12);
      expect(cte.rows.length).toBeGreaterThanOrEqual(6);
    });

    it('acha a coluna certa pelo cabeçalho mesmo com layout deslocado', () => {
      // Cabeçalho diz que "Status Serviço" é a coluna 3 (não a 5 do layout NF-e).
      // Uma coluna nova foi inserida; o índice fixo leria a coluna errada.
      const html = `<table>
        <tr><th>Autorizador</th><th>Coluna Nova</th><th>Autorização</th>
            <th>Status Serviço</th><th>Retorno</th><th>Consulta</th><th>Tempo Médio</th></tr>
        <tr>
          <td>SP</td>
          <td><img src="bola_vermelho.png"></td>
          <td><img src="bola_vermelho.png"></td>
          <td><img src="bola_verde.png"></td>
          <td><img src="bola_vermelho.png"></td>
          <td><img src="bola_vermelho.png"></td>
          <td>2</td>
        </tr></table>`;
      // Parser com layout NF-e (statusIndex fixo=5), mas o cabeçalho manda.
      const res = new AvailabilityParser(DocumentType.NFe).parseWithDiagnostics(html);
      expect(res.headerMatched).toBe(true);
      expect(res.rows[0]?.state).toBe(ServiceState.Operational); // coluna 3 (verde), não a 5
      expect(res.rows[0]?.tMedSeconds).toBe(2); // "Tempo Médio" achado na coluna 6
    });

    it('cai no índice fixo e sinaliza headerMatched=false quando não há cabeçalho', () => {
      // HTML sem <th>: não dá para validar o layout → fallback + sinal de drift.
      const html = `<table><tr>
        <td>SP</td><td><img src="bola_verde.png"></td><td><img src="bola_verde.png"></td>
        <td><img src="bola_verde.png"></td><td><img src="bola_verde.png"></td>
        <td><img src="bola_verde.png"></td><td>1</td>
      </tr></table>`;
      const res = new AvailabilityParser(DocumentType.NFe).parseWithDiagnostics(html);
      expect(res.headerMatched).toBe(false); // sem cabeçalho → possível drift
      expect(res.rows[0]?.state).toBe(ServiceState.Operational); // fallback índice 5 ainda funciona
    });
  });
});
