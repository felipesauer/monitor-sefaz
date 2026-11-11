import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  /** `primary` para a ação principal do bloco; `secondary` (padrão) para as demais. */
  variant?: 'primary' | 'secondary';
  /** Seta de "abre outra página" no fim. */
  arrow?: boolean;
}

/**
 * Link com cara de botão: para as ações que levam a outra página (a página da
 * UF, o que fazer quando cai). Continua sendo um `<a>`, então abre em nova aba
 * e aparece na navegação por links; só não fica sublinhado no meio do texto.
 */
export function ButtonLink({
  children,
  variant = 'secondary',
  arrow = false,
  className = '',
  style,
  ...rest
}: ButtonLinkProps) {
  const look =
    variant === 'primary'
      ? { background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }
      : { background: 'var(--surface)', color: 'var(--text)', borderColor: 'var(--border)' };
  return (
    <a
      {...rest}
      className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      style={{ ...look, ...style }}
    >
      {children}
      {arrow && <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
    </a>
  );
}
