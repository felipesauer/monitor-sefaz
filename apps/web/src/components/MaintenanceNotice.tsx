import { Wrench } from 'lucide-react';
import { useHydrated } from '../hooks/useHydrated.js';
import { inSvrsMaintenance, nextSvrsMaintenance } from '../lib/maintenance.js';
import { formatDay } from '../lib/time.js';
import { stateTextColor } from './serviceState.js';

/**
 * A janela de manutenção programada do SVRS (domingos, 7h às 9h). Dentro dela,
 * um aviso: lentidão e quedas são esperadas. Fora, uma linha discreta com a
 * próxima. Depende do relógio, então só aparece depois da hidratação.
 */
export function MaintenanceNotice({ now }: { now?: number }) {
  const hydrated = useHydrated();
  if (!hydrated) return <p className="min-h-4 text-xs" aria-hidden="true" />;
  const at = now ?? Date.now();
  if (inSvrsMaintenance(at)) {
    return (
      <p
        className="flex items-start gap-2 rounded-xl border p-3 text-sm"
        role="status"
        style={{
          background: 'color-mix(in srgb, var(--slow) 10%, var(--surface))',
          borderColor: 'color-mix(in srgb, var(--slow) 40%, var(--border))',
        }}
      >
        <Wrench
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: stateTextColor('var(--slow)') }}
          aria-hidden="true"
        />
        <span>
          <strong>O SVRS está em manutenção programada agora</strong> (domingo, das 7h às 9h).
          Lentidão e quedas nos estados atendidos por ele são esperadas nesse intervalo.
        </span>
      </p>
    );
  }
  return (
    <p className="flex min-h-4 items-center gap-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
      <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Manutenção programada do SVRS: domingos, das 7h às 9h (horário de Brasília). Próxima:{' '}
      {formatDay(nextSvrsMaintenance(at))}.
    </p>
  );
}
