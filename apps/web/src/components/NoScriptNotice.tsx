/** Aviso para quem abre o site sem JS: o conteúdo chega, o status ao vivo não. */
export function NoScriptNotice() {
  return (
    <noscript>
      <p className="text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        O status ao vivo precisa de JavaScript. Sem ele, consulte a{' '}
        <a
          href="https://www.nfe.fazenda.gov.br/portal/disponibilidade.aspx"
          style={{ color: 'var(--accent)' }}
        >
          página oficial de disponibilidade da SEFAZ
        </a>
        .
      </p>
    </noscript>
  );
}
