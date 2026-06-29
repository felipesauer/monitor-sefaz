import type {
  EnvironmentValue,
  HistoryPeriod,
  HistoryPointDTO,
  ServiceStatusDTO,
} from '@monitor-sefaz/contracts';

// HistoryPeriod vem de @monitor-sefaz/contracts (fonte única) para não divergir
// das janelas suportadas.
export type { HistoryPeriod };

/**
 * Persistência do estado de monitoramento. Abstrai o Redis para que a camada
 * HTTP e o scheduler não conheçam detalhes de armazenamento (DIP) — e para
 * permitir trocar por outra implementação no futuro.
 */
export interface StatusStore {
  /** Grava o snapshot atual de um conjunto de serviços e empurra o histórico. */
  saveSnapshot(env: EnvironmentValue, services: ServiceStatusDTO[]): Promise<void>;
  /** Lê o snapshot atual de um ambiente (vazio se ainda não houver rodada). */
  getSnapshot(env: EnvironmentValue): Promise<ServiceStatusDTO[]>;
  /** Lê o status atual de um serviço específico. */
  getService(env: EnvironmentValue, id: string): Promise<ServiceStatusDTO | null>;
  /** Lê a série temporal curta de um serviço dentro de um período. */
  getHistory(env: EnvironmentValue, id: string, period: HistoryPeriod): Promise<HistoryPointDTO[]>;
  /** Publica os serviços que mudaram de estado (para fan-out em tempo real). */
  publishUpdates(env: EnvironmentValue, changed: ServiceStatusDTO[]): Promise<void>;
}

/** Milissegundos correspondentes a cada período de histórico. */
export const PERIOD_MS: Record<HistoryPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '72h': 72 * 60 * 60 * 1000,
};

/** Nome do canal Redis de atualizações de status. */
export const UPDATES_CHANNEL = 'monitor-sefaz:status-updates';
