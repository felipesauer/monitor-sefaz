import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import { ServiceDetailPanel } from '../src/components/ServiceDetailPanel.js';

// Histórico e detalhe nunca chegam: o teste é sobre o diálogo, não sobre os dados.
vi.stubGlobal(
  'fetch',
  vi.fn(() => new Promise(() => {}))
);

const service: ServiceStatusDTO = {
  id: 'NFe:SP',
  document: 'NFe',
  uf: 'SP',
  authorizer: 'SP',
  environment: 'production',
  state: 'OPERATIONAL',
  cStat: 107,
  xMotivo: null,
  latencyMs: 240,
  error: null,
  checkedAt: '2026-11-11T00:00:00.000Z',
};

/** Um botão que abre o painel, como o card do serviço na grade. */
function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir NF-e SP
      </button>
      {open && (
        <ServiceDetailPanel
          service={service}
          onClose={() => {
            onClose();
            setOpen(false);
          }}
        />
      )}
    </QueryClientProvider>
  );
}

function openPanel(onClose?: () => void) {
  render(<Harness onClose={onClose} />);
  const opener = screen.getByRole('button', { name: 'Abrir NF-e SP' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe('ServiceDetailPanel', () => {
  it('é um diálogo modal com o título do serviço', () => {
    openPanel();
    const dialog = screen.getByRole('dialog', { name: 'NF-e · São Paulo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('põe o foco no botão de fechar e trava a rolagem da página', () => {
    openPanel();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('fecha com Esc e devolve o foco a quem abriu', () => {
    const onClose = vi.fn();
    const opener = openPanel(onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('mantém o Tab dentro do painel', () => {
    openPanel();
    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button');
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('diz para onde vai a NF-e em contingência e liga para o que fazer na página da UF', () => {
    openPanel();
    expect(screen.getByText('Contingência SVC-AN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /O que fazer quando a SEFAZ-SP cai/ })).toHaveAttribute(
      'href',
      '/sefaz-sp/#o-que-fazer'
    );
  });

  it('mostra a bandeira e a frase do estado', () => {
    openPanel();
    expect(screen.getByAltText('Bandeira de São Paulo')).toHaveAttribute('src', '/flags/sp.png');
    expect(screen.getByText('Respondendo normalmente.')).toBeInTheDocument();
  });
});

describe('ServiceDetailPanel de autorizador compartilhado', () => {
  it('lista os estados que caem junto, com link para cada um', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ServiceDetailPanel
          service={{ ...service, id: 'NFe:AC', uf: 'AC', authorizer: 'SVRS' }}
          onClose={() => {}}
        />
      </QueryClientProvider>
    );
    expect(screen.getByText(/O SVRS autoriza o NF-e de mais \d+ estados/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AL' })).toHaveAttribute('href', '/sefaz-al/');
  });
});
