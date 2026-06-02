import { DocumentType } from '@monitor-sefaz/contracts';

/** Valor do filtro de documento: um tipo específico ou "todos". */
export type DocumentFilter = DocumentType | 'ALL';

interface DocumentFilterTabsProps {
  value: DocumentFilter;
  onChange: (value: DocumentFilter) => void;
}

const TABS: { value: DocumentFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: DocumentType.NFe, label: 'NF-e' },
  { value: DocumentType.NFCe, label: 'NFC-e' },
  { value: DocumentType.CTe, label: 'CT-e' },
  { value: DocumentType.MDFe, label: 'MDF-e' },
  { value: DocumentType.DCe, label: 'DC-e' },
];

/** Abas para filtrar a grade por tipo de documento. */
export function DocumentFilterTabs({ value, onChange }: DocumentFilterTabsProps) {
  return (
    <nav className="doc-tabs" aria-label="Filtrar por documento">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`doc-tab${value === tab.value ? ' doc-tab--active' : ''}`}
          aria-pressed={value === tab.value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
