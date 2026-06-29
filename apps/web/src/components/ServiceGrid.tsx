import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ServiceStatusDTO } from '@monitor-sefaz/contracts';
import type { HistorySeries } from '../api/DataSource.js';
import { ServiceCard } from './ServiceCard.js';

interface ServiceGridProps {
  services: ServiceStatusDTO[];
  series: HistorySeries;
  onSelect: (service: ServiceStatusDTO) => void;
  pageSize?: number;
}

/** Grade paginada de cards de serviço. */
export function ServiceGrid({ services, series, onSelect, pageSize = 24 }: ServiceGridProps) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(services.length / pageSize));

  // Volta para a primeira página quando o CONJUNTO filtrado muda. Usar o total
  // (services.length) não bastava: trocar de um filtro para outro de mesmo
  // tamanho mantinha a página atual, exibindo um recorte arbitrário.
  const filterKey = services.map((s) => s.id).join(',');
  useEffect(() => {
    setPage(0);
  }, [filterKey]);

  const current = Math.min(page, pages - 1);
  const slice = services.slice(current * pageSize, current * pageSize + pageSize);

  if (services.length === 0) {
    return (
      <p className="py-16 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Nenhum serviço corresponde aos filtros.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {slice.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            spark={series[service.id]}
            onSelect={onSelect}
          />
        ))}
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginação">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-40"
            style={{ background: 'var(--surface)' }}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Página {current + 1} de {pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-40"
            style={{ background: 'var(--surface)' }}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
