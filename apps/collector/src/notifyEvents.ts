import {
  DocumentType,
  type HistoryFileDTO,
  type NotificationEventDTO,
  type ServiceStatusDTO,
  type SourceHealthDTO,
} from '@monitor-sefaz/contracts';
import { detectTransitions } from '@monitor-sefaz/notifier';
import { KNOWN_UNREACHABLE_SOURCES } from './driftCheck.js';

/**
 * Reconstrói o "estado anterior" por serviço a partir do history.json: o ÚLTIMO
 * ponto de cada série é o estado com que comparar a coleta atual. É assim que o
 * caminho sem servidor (GitHub Actions) obtém o `prev` que o Scheduler mantém em
 * memória — o history versionado é a nossa memória entre execuções do cron.
 */
export function previousFromHistory(
  history: HistoryFileDTO
): Pick<ServiceStatusDTO, 'id' | 'uf' | 'document' | 'state' | 'cStat' | 'source'>[] {
  const prev: Pick<
    ServiceStatusDTO,
    'id' | 'uf' | 'document' | 'state' | 'cStat' | 'source'
  >[] = [];
  for (const [id, points] of Object.entries(history.series)) {
    const last = points[points.length - 1];
    if (!last) continue;
    // id é "Document:UF" (ex.: "NFe:SP"); document precisa casar o enum.
    const [doc, uf] = id.split(':');
    if (!doc || !uf || !(doc in DocumentType)) continue;
    prev.push({
      id,
      uf,
      document: DocumentType[doc as keyof typeof DocumentType],
      state: last.state,
      cStat: last.cStat,
      source: last.source,
    });
  }
  return prev;
}

/**
 * Eventos SOURCE_DEGRADED para as fontes OFICIAIS que vieram degradadas nesta
 * coleta (drift do portal). Fontes com indisponibilidade estrutural conhecida
 * (`KNOWN_UNREACHABLE_SOURCES` — ex.: a Receita, bloqueada nos IPs do Actions)
 * são ignoradas: degradam sempre por infra, não por drift, e alertar a cada
 * coleta seria ruído que mascararia um drift real. Emite por-coleta enquanto a
 * fonte seguir degradada; o filtro NOTIFY_EVENTS controla o resto.
 */
export function sourceDegradedEvents(
  sources: SourceHealthDTO[] | undefined,
  occurredAt: string
): NotificationEventDTO[] {
  if (!sources) return [];
  return sources
    .filter((s) => s.official && s.degraded && !KNOWN_UNREACHABLE_SOURCES.has(s.source))
    .map((s) => ({
      type: 'SOURCE_DEGRADED' as const,
      source: s.source,
      occurredAt,
      payload: { coverage: s.coverage, collected: s.collected, expected: s.expected },
    }));
}

/**
 * Monta todos os eventos de notificação de uma coleta: transições de estado
 * (serviço/contingência) via history + fontes oficiais degradadas.
 */
export function buildNotificationEvents(
  history: HistoryFileDTO,
  services: ServiceStatusDTO[],
  sources: SourceHealthDTO[] | undefined,
  occurredAt: string
): NotificationEventDTO[] {
  const transitions = detectTransitions(previousFromHistory(history), services, occurredAt);
  return [...transitions, ...sourceDegradedEvents(sources, occurredAt)];
}
