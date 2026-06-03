import { useEffect, useState } from 'react';

interface UpdateInfoProps {
  /** Timestamp ISO da última atualização dos dados (generatedAt). */
  generatedAt: string;
  /** Intervalo entre atualizações da fonte (ms) — para estimar a próxima. */
  refreshIntervalMs: number;
}

function formatRelative(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return `${h}h`;
}

/**
 * Mostra "Atualizado há X · próxima em ~Y", com tempo relativo que avança
 * sozinho (tick a cada 15s). Deixa clara a frescura do dado.
 */
export function UpdateInfo({ generatedAt, refreshIntervalMs }: UpdateInfoProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const generated = Date.parse(generatedAt);
  if (Number.isNaN(generated)) {
    return null;
  }

  const elapsed = now - generated;
  const remaining = refreshIntervalMs - (elapsed % refreshIntervalMs);

  return (
    <p className="update-info">
      <span className="update-info__dot" aria-hidden />
      Atualizado há {formatRelative(elapsed)} · próxima em ~{formatRelative(remaining)}
    </p>
  );
}
