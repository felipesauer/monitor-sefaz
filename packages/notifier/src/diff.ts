import {
  isUp,
  type NotificationEventDTO,
  type ServiceStatusDTO,
} from '@monitor-sefaz/contracts';

/** Um serviço com o mínimo que a detecção de transição precisa. */
type ServiceLike = Pick<
  ServiceStatusDTO,
  'id' | 'uf' | 'document' | 'state' | 'cStat' | 'source'
>;

const CONTINGENCY = 'CONTINGENCY';

/**
 * Detecta as transições de estado entre dois snapshots e as traduz em eventos de
 * notificação. Função PURA — é a fonte única de verdade da semântica de eventos,
 * reusada tanto no Scheduler da API (que guarda `prev` num Map em memória) quanto
 * no collector (que reconstrói `prev` do history.json). Não faz I/O.
 *
 * Regras (espelham a semântica de mudança de estado do Scheduler):
 * - BASELINE: um serviço presente em `next` mas AUSENTE em `prev` não gera evento
 *   (não sabemos o estado anterior; a primeira coleta nunca "alarma").
 * - Disponibilidade (via `isUp`, que trata CONTINGENCY como "no ar"):
 *     up → !up  ⇒ SERVICE_DOWN
 *     !up → up  ⇒ SERVICE_RECOVERED
 * - Contingência (independente de DOWN/RECOVERED, pois isUp(CONTINGENCY)===true):
 *     ≠CONTINGENCY → CONTINGENCY  ⇒ CONTINGENCY_ENTERED
 *     CONTINGENCY → ≠CONTINGENCY  ⇒ CONTINGENCY_EXITED
 *
 * Um mesmo serviço pode emitir DOIS eventos numa transição (ex.: DOWN→CONTINGENCY
 * gera SERVICE_RECOVERED **e** CONTINGENCY_ENTERED) — são sinais ortogonais.
 */
export function detectTransitions(
  prev: readonly ServiceLike[],
  next: readonly ServiceLike[],
  occurredAt: string
): NotificationEventDTO[] {
  const prevById = new Map(prev.map((s) => [s.id, s]));
  const events: NotificationEventDTO[] = [];

  for (const cur of next) {
    const before = prevById.get(cur.id);
    if (!before) {
      continue; // baseline: sem estado anterior, sem evento
    }
    if (before.state === cur.state) {
      continue; // sem mudança
    }

    const base = {
      serviceId: cur.id,
      uf: cur.uf,
      document: cur.document,
      previousState: before.state,
      currentState: cur.state,
      cStat: cur.cStat,
      source: cur.source,
      occurredAt,
    };

    // Disponibilidade
    if (isUp(before.state) && !isUp(cur.state)) {
      events.push({ ...base, type: 'SERVICE_DOWN' });
    } else if (!isUp(before.state) && isUp(cur.state)) {
      events.push({ ...base, type: 'SERVICE_RECOVERED' });
    }

    // Contingência (ortogonal à disponibilidade)
    if (before.state !== CONTINGENCY && cur.state === CONTINGENCY) {
      events.push({ ...base, type: 'CONTINGENCY_ENTERED' });
    } else if (before.state === CONTINGENCY && cur.state !== CONTINGENCY) {
      events.push({ ...base, type: 'CONTINGENCY_EXITED' });
    }
  }

  return events;
}
