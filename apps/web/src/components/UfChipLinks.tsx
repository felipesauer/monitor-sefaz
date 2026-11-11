import type { UF } from '@monitor-sefaz/catalog';
import { UF_NAME } from '../lib/labels.js';
import { pageHref } from '../lib/pages.js';

/** Botões com a bandeira e a sigla de cada UF, que levam à página do estado. */
export function UfChipLinks({ ufs, label }: { ufs: readonly UF[]; label: string }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={label}>
      {ufs.map((uf) => (
        <li key={uf}>
          <a
            href={pageHref({ kind: 'uf', uf })}
            title={`Status da SEFAZ-${uf} (${UF_NAME[uf] ?? uf})`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors hover:brightness-95"
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              borderColor: 'var(--border)',
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}flags/${uf.toLowerCase()}.png`}
              alt=""
              width={16}
              height={11}
              loading="lazy"
              className="h-[11px] w-4 rounded-[2px] object-cover"
            />
            {uf}
          </a>
        </li>
      ))}
    </ul>
  );
}
