import { Star } from 'lucide-react';
import { useGitHubStars } from '../hooks/useGitHubStars.js';
import { REPO_URL } from '../lib/githubStars.js';

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact' });

/**
 * Convite para dar estrela no repositório, com a contagem quando a API do
 * GitHub responde. Sem `noreferrer` de propósito: é o referrer que faz o
 * site aparecer em "Referring sites" no Insights → Traffic do repositório,
 * e é por ali que dá para ver quantas visitas o botão rende.
 */
export function GitHubStarButton() {
  const stars = useGitHubStars();
  // Zero não convence ninguém: abaixo de uma estrela, o botão vai sem número.
  const count = stars && stars > 0 ? compact.format(stars) : null;

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener"
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors hover:opacity-80"
      style={{ background: 'var(--surface)' }}
      title="Dar uma estrela ao projeto no GitHub"
      aria-label={count ? `Star no GitHub, ${count} estrelas` : undefined}
    >
      <Star
        className="h-4 w-4"
        style={{ color: 'var(--star)', fill: 'var(--star)' }}
        aria-hidden="true"
      />
      Star no GitHub
      {count && (
        <span
          aria-hidden="true"
          className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium"
          style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
        >
          {count}
        </span>
      )}
    </a>
  );
}
