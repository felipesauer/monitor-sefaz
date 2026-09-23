import { UF_INFO, type UF } from '@monitor-sefaz/catalog';
import { pageHref } from '../lib/pages.js';
import { UFS_BY_REGION } from '../lib/ufFacts.js';

interface UfDirectoryProps {
  /** UF da página atual: aparece destacada, sem link para si mesma. */
  current?: UF;
}

/**
 * Links para a página de cada UF, agrupados por região. São eles que ligam a
 * home às páginas por estado, e as páginas entre si — para o visitante e para
 * o buscador, que chega às páginas seguindo links.
 */
export function UfDirectory({ current }: UfDirectoryProps) {
  return (
    <nav
      aria-label="Status da SEFAZ por estado"
      className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5"
    >
      {UFS_BY_REGION.map(({ region, ufs }) => (
        <div key={region}>
          <h3
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-dim)' }}
          >
            {region}
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {ufs.map((uf) => (
              <li key={uf}>
                {uf === current ? (
                  <span aria-current="page" className="font-semibold">
                    {UF_INFO[uf].nome} <span className="font-mono text-xs">{uf}</span>
                  </span>
                ) : (
                  <a
                    href={pageHref({ kind: 'uf', uf })}
                    className="hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    {UF_INFO[uf].nome}{' '}
                    <span className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>
                      {uf}
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
