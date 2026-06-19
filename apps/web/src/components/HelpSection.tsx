import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface QA {
  q: string;
  a: string;
}

const FAQ: QA[] = [
  {
    q: 'O que significam os estados (cStat 107/108/109)?',
    a: 'A SEFAZ responde a uma "consulta status do serviço" com um código (cStat). 107 = Serviço em Operação (verde). 108 = Paralisado Momentaneamente (amarelo/instável). 109 = Paralisado sem Previsão (vermelho/indisponível). "Contingência" (azul) indica que a UF está operando por um ambiente de contingência (SVC) — ainda é possível emitir. "Sem dados" (cinza) significa que não conseguimos ler o status naquele momento.',
  },
  {
    q: 'O que é um "autorizador"?',
    a: 'É o ambiente que efetivamente processa os documentos de uma UF. Alguns estados têm autorizador próprio (ex: SP, MG, RS, PR); a maioria delega para um ambiente virtual. Quando o autorizador cai, todas as UFs atendidas por ele são afetadas ao mesmo tempo.',
  },
  {
    q: 'O que são SVRS, SVAN e o Ambiente Nacional?',
    a: 'SVRS (Sefaz Virtual do RS) e SVAN (Sefaz Virtual do Ambiente Nacional) são ambientes que autorizam documentos em nome de vários estados que não mantêm infraestrutura própria. O Ambiente Nacional (AN) centraliza serviços como o de MDF-e. Por isso muitas UFs compartilham exatamente o mesmo status.',
  },
  {
    q: 'O que é contingência (SVC-AN / SVC-RS)?',
    a: 'São ambientes de contingência usados quando o autorizador principal de um estado está indisponível, permitindo continuar emitindo documentos. Na tela, uma UF em contingência aparece em azul: o serviço está no ar, mas operando pelo ambiente alternativo (SVC), não pelo principal.',
  },
  {
    q: 'De onde vêm os dados e com que frequência?',
    a: 'Consolidamos o monitoramento público de disponibilidade da SEFAZ (não exige certificado), por UF e para os 5 documentos. Se a fonte principal ficar indisponível, recorremos automaticamente à consulta da página oficial. O status na tela é atualizado ao vivo; o histórico é amostrado periodicamente (cerca de uma vez por hora), então janelas curtas de instabilidade podem não ser registradas no gráfico.',
  },
];

/** Seção de Ajuda/FAQ colapsável, explicando os conceitos da SEFAZ. */
export function HelpSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="rounded-xl border"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <HelpCircle className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Como funciona / Perguntas frequentes
        </span>
        <ChevronDown
          className="h-4 w-4 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t px-4 py-4">
          {FAQ.map((item) => (
            <div key={item.q}>
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                {item.a}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
