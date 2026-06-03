import { Activity, LayoutGrid, Moon, Pause, Play, RefreshCw, Sun } from 'lucide-react';
import type { Theme } from '../hooks/useTheme.js';

/** Modos de layout do painel (espelha o monitorsefaz). */
export type LayoutMode = 'operation' | 'panel' | 'metrics';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  layout: LayoutMode;
  onLayout: (mode: LayoutMode) => void;
  generatedAt?: string;
  refreshLabel: string;
  paused: boolean;
  onTogglePause: () => void;
  onRefresh: () => void;
}

const MODES: { value: LayoutMode; label: string }[] = [
  { value: 'operation', label: 'Operação' },
  { value: 'panel', label: 'Painel' },
  { value: 'metrics', label: 'Painel + métricas' },
];

/** Cabeçalho: marca, modos de layout, atualização e controles. */
export function Header({
  theme,
  onToggleTheme,
  layout,
  onLayout,
  generatedAt,
  refreshLabel,
  paused,
  onTogglePause,
  onRefresh,
}: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: 'var(--accent)' }}
          >
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Monitor SEFAZ</h1>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Disponibilidade de NF-e, NFC-e, CT-e, MDF-e e DC-e
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* modos de layout */}
          <div
            className="inline-flex items-center gap-0.5 rounded-lg border p-0.5"
            role="group"
            aria-label="Modos de layout"
            style={{ background: 'var(--surface-2)' }}
          >
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onLayout(m.value)}
                aria-pressed={layout === m.value}
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={
                  layout === m.value
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'var(--text-dim)' }
                }
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* atualização */}
          <div className="hidden text-right text-xs sm:block" style={{ color: 'var(--text-dim)' }}>
            {generatedAt && (
              <div>
                Atualizado:{' '}
                <span className="font-medium">
                  {new Date(generatedAt).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            )}
            <div className="text-[11px] opacity-80">{refreshLabel}</div>
          </div>

          {/* controles */}
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)' }}
            title="Atualizar agora"
            aria-label="Atualizar agora"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)' }}
            title={paused ? 'Retomar atualização' : 'Pausar atualização'}
            aria-label={paused ? 'Retomar' : 'Pausar'}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)' }}
            title="Alternar tema"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
