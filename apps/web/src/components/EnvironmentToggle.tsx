import type { EnvironmentValue } from '@monitor-sefaz/contracts';

interface EnvironmentToggleProps {
  value: EnvironmentValue;
  onChange: (env: EnvironmentValue) => void;
}

const OPTIONS: { value: EnvironmentValue; label: string }[] = [
  { value: 'producao', label: 'Produção' },
  { value: 'homologacao', label: 'Homologação' },
];

/** Alternador entre ambiente de produção e homologação. */
export function EnvironmentToggle({ value, onChange }: EnvironmentToggleProps) {
  return (
    <div className="toggle" role="group" aria-label="Ambiente">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`toggle__button${value === option.value ? ' toggle__button--active' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
