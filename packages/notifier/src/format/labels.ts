import type { NotificationEventDTO, NotificationEventType } from '@monitor-sefaz/contracts';

/** Aparência de um tipo de evento, compartilhada pelos formatters de canal. */
export interface EventLabel {
  /** Emoji + texto curto para o título da mensagem. */
  readonly title: string;
  /** Cor em RGB inteiro (Discord usa `color`; Slack, hex derivado). */
  readonly color: number;
}

const LABELS: Record<NotificationEventType, EventLabel> = {
  SERVICE_DOWN: { title: '🔴 Serviço fora do ar', color: 0xe4_3f_52 },
  SERVICE_RECOVERED: { title: '🟢 Serviço normalizado', color: 0x2e_ca_8b },
  CONTINGENCY_ENTERED: { title: '🟠 Entrou em contingência', color: 0xf1_74_25 },
  CONTINGENCY_EXITED: { title: '🟢 Saiu de contingência', color: 0x2e_ca_8b },
  TECHNICAL_NOTE: { title: '📄 Nova Nota Técnica', color: 0x00_99_ff },
  SOURCE_DEGRADED: { title: '⚠️ Fonte oficial degradada', color: 0xf1_74_25 },
  DAILY_DIGEST: { title: '📊 Resumo diário', color: 0x00_99_ff },
};

export function labelFor(type: NotificationEventType): EventLabel {
  return LABELS[type];
}

/**
 * Linha descritiva de um evento, comum a todos os canais. Para eventos de serviço
 * traz "NFe:SP OPERATIONAL → DOWN"; para os demais, usa o título/payload.
 */
export function describeEvent(event: NotificationEventDTO): string {
  if (event.serviceId && event.previousState && event.currentState) {
    return `${event.serviceId}: ${event.previousState} → ${event.currentState}`;
  }
  if (event.type === 'SOURCE_DEGRADED' && event.source) {
    return `Fonte ${event.source} abaixo do piso de cobertura`;
  }
  if (event.type === 'TECHNICAL_NOTE') {
    const title = typeof event.payload?.title === 'string' ? event.payload.title : 'Nota Técnica';
    return title;
  }
  if (event.type === 'DAILY_DIGEST') {
    const p = event.payload ?? {};
    const avail = typeof p.availability === 'number' ? `${p.availability}%` : '—';
    const op = typeof p.operational === 'number' ? p.operational : '—';
    const total = typeof p.total === 'number' ? p.total : '—';
    const degraded = Array.isArray(p.degradedSources) ? p.degradedSources : [];
    const degradedTxt = degraded.length > 0 ? ` · fontes degradadas: ${degraded.join(', ')}` : '';
    return `Disponibilidade ${avail} · ${op}/${total} no ar${degradedTxt}`;
  }
  return labelFor(event.type).title;
}
