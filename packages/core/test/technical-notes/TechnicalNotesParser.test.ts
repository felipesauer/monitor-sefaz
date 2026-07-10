import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTechnicalNotes } from '../../src/technical-notes/TechnicalNotesParser.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  join(here, '..', 'fixtures', 'technical-notes', 'lista.html'),
  'latin1'
);

describe('parseTechnicalNotes', () => {
  it('extrai TODAS as notas da lista (não só a primeira)', () => {
    const notes = parseTechnicalNotes(fixture);
    expect(notes).toHaveLength(3);
    expect(notes.map((n) => n.title)).toEqual([
      'Nota Técnica 2024.001 - Novo layout NFe',
      'Nota Técnica 2023.004 - Ajustes de validação',
      'Nota Técnica 2023.003 - Eventos',
    ]);
  });

  it('persiste o link, absolutizando href relativo do portal', () => {
    const notes = parseTechnicalNotes(fixture);
    expect(notes[0]!.link).toBe(
      'https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=abc123='
    );
    // href já absoluto é mantido
    expect(notes[2]!.link).toBe(
      'https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=ghi789='
    );
  });

  it('página sem notas devolve lista vazia', () => {
    expect(parseTechnicalNotes('<html><body><p>nada aqui</p></body></html>')).toEqual([]);
  });

  it('deduplica títulos+link repetidos na mesma página', () => {
    const dup = `<div>
      <a href="x.aspx"><span class="tituloConteudo">NT Repetida</span></a>
      <a href="x.aspx"><span class="tituloConteudo">NT Repetida</span></a>
    </div>`;
    expect(parseTechnicalNotes(dup)).toHaveLength(1);
  });
});
