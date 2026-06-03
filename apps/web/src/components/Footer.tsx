import { Github } from 'lucide-react';

/** Rodapé com fonte oficial, repositório e aviso de não-afiliação. */
export function Footer() {
  return (
    <footer className="mt-10 border-t pt-6 pb-10 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            className="inline-flex items-center gap-1.5 hover:underline"
            href="https://github.com/felipesauer/monitor-sefaz"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            <Github className="h-3.5 w-3.5" />
            Código no GitHub
          </a>
          <a
            className="hover:underline"
            href="https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            Fonte oficial SEFAZ
          </a>
        </div>
        <p className="max-w-xl leading-relaxed">
          Projeto open-source e independente. Os dados vêm da página pública de disponibilidade da
          SEFAZ. Não somos afiliados à SEFAZ ou à Receita Federal.
        </p>
      </div>
    </footer>
  );
}
