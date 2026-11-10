/**
 * Marca do GitHub (octocat). Fica inline porque o lucide-react 1.x removeu os
 * ícones de marca; um SVG próprio não depende da biblioteca para isso.
 */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** Rodapé com fonte oficial, repositório e aviso de não-afiliação. */
export function Footer() {
  return (
    <footer
      className="mt-10 border-t pt-6 pb-10 text-center text-xs"
      style={{ color: 'var(--text-dim)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a
            className="inline-flex items-center gap-1.5 hover:underline"
            href="https://github.com/felipesauer/monitor-sefaz"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--accent)' }}
          >
            <GithubMark className="h-3.5 w-3.5" />
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
