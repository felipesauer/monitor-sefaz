import { describe, it, expect } from 'vitest';
import { DocumentType } from '@monitor-sefaz/catalog';
import { SvrsCollector } from '../src/svrs/SvrsCollector.js';
import { AvailabilityCollector } from '../src/availability/AvailabilityCollector.js';
import { IntegraNotasCollector } from '../src/integranotas/IntegraNotasCollector.js';

const DOCS = [DocumentType.NFe, DocumentType.CTe, DocumentType.MDFe];

/**
 * Provider falso cujas páginas só respondem depois que TODAS foram pedidas. Em
 * série, a primeira nunca responderia e a coleta travaria; o teste corta em 1 s.
 * A primeira página falha, para provar que a falha de uma não segura as outras.
 */
function gatedProvider<T>(value: T) {
  const started: DocumentType[] = [];
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  return {
    started,
    provider: {
      supportedDocuments: () => DOCS,
      fetch: async (document: DocumentType) => {
        started.push(document);
        if (started.length === DOCS.length) open();
        await gate;
        if (document === DOCS[0]) throw new Error('portal fora do ar');
        return value;
      },
    },
  };
}

const within = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('a coleta buscou as páginas em série')), 1000)
    ),
  ]);

describe('coletores buscam as páginas dos documentos em paralelo', () => {
  it('SvrsCollector', async () => {
    const { started, provider } = gatedProvider([]);
    await within(new SvrsCollector(provider as never).collect());
    expect(started).toEqual(DOCS);
  });

  it('AvailabilityCollector', async () => {
    const { started, provider } = gatedProvider([]);
    await within(new AvailabilityCollector(provider as never).collect());
    expect(started).toEqual(DOCS);
  });

  it('IntegraNotasCollector', async () => {
    const { started, provider } = gatedProvider({ rows: [], fetchLatencyMs: 0 });
    await within(new IntegraNotasCollector(provider as never).collect());
    expect(started).toEqual(DOCS);
  });
});
