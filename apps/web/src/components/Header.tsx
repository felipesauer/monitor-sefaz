import { Activity, Moon, Pause, Play, RefreshCw, Sun } from 'lucide-react';
import { GitHubStarButton } from './GitHubStarButton.js';

/** Modos de layout do painel (espelha o monitorsefaz). */
interface HeaderProps {
  onToggleTheme: () => void;
  /** Modos de layout do painel. As páginas por UF não têm: sem eles, o seletor some. */
  generatedAt?: string;
  refreshLabel: string;
  paused: boolean;
  onTogglePause: () => void;
  onRefresh: () => void;
  /**
   * Nas páginas internas, a marca vira link para o painel e deixa o <h1> para
   * o assunto da página.
   */
  homeHref?: string;
}

/** Cabeçalho: marca, modos de layout, atualização e controles. */
export function Header({
  onToggleTheme,
  generatedAt,
  refreshLabel,
  paused,
  onTogglePause,
  onRefresh,
  homeHref,
}: HeaderProps) {
  const Title = homeHref ? 'p' : 'h1';
  const brand = (
    <>
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
        style={{ background: 'var(--accent)' }}
      >
        <Activity className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <Title className="whitespace-nowrap text-base font-bold leading-tight sm:text-lg">
          Monitor SEFAZ
        </Title>
        <p className="hidden text-xs sm:block" style={{ color: 'var(--text-dim)' }}>
          Disponibilidade de NF-e, NFC-e, CT-e, MDF-e, DC-e e BP-e
        </p>
      </div>
    </>
  );

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        {homeHref ? (
          <a href={homeHref} className="flex min-w-0 items-center gap-3">
            {brand}
          </a>
        ) : (
          <div className="flex min-w-0 items-center gap-3">{brand}</div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {/* atualização */}
          <div className="hidden text-right text-xs xl:block" style={{ color: 'var(--text-dim)' }}>
            {generatedAt && (
              <div>
                Atualizado:{' '}
                <span className="font-medium">
                  {new Date(generatedAt).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            )}
            <div className="text-[11px]">{refreshLabel}</div>
          </div>

          <GitHubStarButton />

          {/* controles */}
          <button
            type="button"
            onClick={onRefresh}
            className="hidden h-9 w-9 items-center justify-center rounded-lg border sm:flex transition-colors hover:opacity-80"
            style={{ background: 'var(--surface)' }}
            title="Atualizar agora"
            aria-label="Atualizar agora"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="hidden h-9 w-9 items-center justify-center rounded-lg border sm:flex transition-colors hover:opacity-80"
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
            {/* O ícone segue a classe `dark` do <html> via CSS, não o estado do
                React: assim ele já sai certo no HTML pré-renderizado. */}
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </button>
        </div>
      </div>
    </header>
  );
}
