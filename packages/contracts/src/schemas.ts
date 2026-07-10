import { z } from 'zod';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';

// Reexporta os enums de domínio para que o front consuma tudo de um só pacote.
export { DocumentType, Environment } from '@monitor-sefaz/catalog';

/** Enum Zod para os tipos de documento. */
export const documentTypeSchema = z.nativeEnum(DocumentType);

/** Estado normalizado do serviço (espelha `ServiceState` do core). */
export const serviceStateSchema = z.enum([
  'OPERATIONAL',
  'CONTINGENCY',
  'SLOWDOWN',
  'DOWN',
  'ERROR',
]);
export type ServiceStateValue = z.infer<typeof serviceStateSchema>;

/**
 * Origem da medição que VENCEU o consenso por serviço:
 * - `svrs` / `availability`: fontes OFICIAIS (portal SVRS e portal da Receita),
 *   com precedência de estado. `svrs` traz `cStat` real e não mede latência de
 *   rede (pode herdá-la de outra fonte no consenso).
 * - `integranotas`: terceiro mais completo; preenche serviços que as oficiais não
 *   publicam. `latencyMs` aqui é a latência de REDE real do fetch (ms).
 * Opcional para compatibilidade com dados gravados antes deste campo; ausente é
 * tratado como `integranotas`.
 */
export const statusSourceSchema = z.enum(['integranotas', 'availability', 'svrs']);
export type StatusSourceValue = z.infer<typeof statusSourceSchema>;

/** Ambiente em formato textual usado na API (contrato em inglês). */
export const environmentSchema = z.enum(['production', 'homologation']);
export type EnvironmentValue = z.infer<typeof environmentSchema>;

/** Converte a chave textual de ambiente para o enum numérico do core. */
export function toEnvironment(value: EnvironmentValue): Environment {
  return value === 'production' ? Environment.Production : Environment.Homologation;
}

/** Converte o enum numérico do core para a chave textual da API. */
export function fromEnvironment(env: Environment): EnvironmentValue {
  return env === Environment.Production ? 'production' : 'homologation';
}

/** Status atual de um serviço (documento+UF) — item do snapshot. */
export const serviceStatusSchema = z.object({
  /** Identificador estável `{document}:{uf}` (ex: "NFe:SP"). */
  id: z.string(),
  document: documentTypeSchema,
  uf: z.string(),
  authorizer: z.string(),
  environment: environmentSchema,
  state: serviceStateSchema,
  cStat: z.number().nullable(),
  xMotivo: z.string().nullable(),
  latencyMs: z.number(),
  source: statusSourceSchema.optional(),
  error: z.string().nullable(),
  checkedAt: z.string(), // ISO 8601 — quando o MONITOR coletou
  /**
   * Horário "HH:MM:SS" em que a própria FONTE verificou o serviço (frescor do
   * dado oficial). Hoje só o SVRS publica; ausente nas demais fontes.
   */
  sourceCheckedAt: z.string().optional(),
});
export type ServiceStatusDTO = z.infer<typeof serviceStatusSchema>;

/** Snapshot completo de um ambiente. */
export const statusSnapshotSchema = z.object({
  environment: environmentSchema,
  generatedAt: z.string(),
  services: z.array(serviceStatusSchema),
});
export type StatusSnapshotDTO = z.infer<typeof statusSnapshotSchema>;

/**
 * Variante TOLERANTE do snapshot para o front consumir fontes que podem evoluir
 * (estado novo, cStat inesperado): um service inválido é DESCARTADO em vez de
 * derrubar todo o snapshot. A API/worker continuam emitindo `statusSnapshotSchema`
 * estrito — esta só relaxa a leitura, degradando em vez de esconder tudo.
 */
export const resilientStatusSnapshotSchema = z.object({
  environment: environmentSchema,
  generatedAt: z.string(),
  services: z
    .array(serviceStatusSchema.nullable().catch(null))
    .transform((items) => items.filter((s): s is ServiceStatusDTO => s !== null)),
});

/** Resumo agregado de disponibilidade. */
export const summaryGroupSchema = z.object({
  key: z.string(),
  total: z.number(),
  operational: z.number(),
  availability: z.number(),
});

/**
 * Saúde de UMA fonte na última coleta. `degraded` sinaliza DRIFT: uma fonte que
 * normalmente cobre a maior parte do catálogo veio muito abaixo do piso — indício
 * de que o portal mudou o HTML e o parser parou de casar, em vez de uma queda real
 * da SEFAZ (que retornaria os serviços com estado DOWN/ERROR, não ausentes).
 */
export const sourceHealthSchema = z.object({
  source: statusSourceSchema,
  official: z.boolean(),
  /** Serviços que a fonte devolveu nesta coleta. */
  collected: z.number(),
  /** Total de serviços do catálogo (referência de cobertura). */
  expected: z.number(),
  /** collected / expected, 0..1, arredondado a 3 casas. */
  coverage: z.number(),
  /** coverage abaixo do piso → provável drift do portal. */
  degraded: z.boolean(),
});
export type SourceHealthDTO = z.infer<typeof sourceHealthSchema>;

export const summarySchema = z.object({
  environment: environmentSchema,
  generatedAt: z.string(),
  total: z.number(),
  operational: z.number(),
  failing: z.number(),
  availability: z.number(),
  avgLatencyMs: z.number().nullable(),
  byDocument: z.array(summaryGroupSchema),
  byAuthorizer: z.array(summaryGroupSchema),
  /**
   * Diagnóstico por fonte da última coleta (opcional para retrocompat com
   * summaries antigos que não o traziam). Base do sinal de drift.
   */
  sources: z.array(sourceHealthSchema).optional(),
});
export type SummaryDTO = z.infer<typeof summarySchema>;

/** Períodos suportados pela consulta de histórico curto. */
// '1h'/'6h' foram removidos: com a cadência real de coleta (~3h/ponto) rendem
// 0–2 amostras, deixando gráfico vazio e uptime sobre amostra única.
export const historyPeriodSchema = z.enum(['24h', '72h']);
export type HistoryPeriod = z.infer<typeof historyPeriodSchema>;

/** Ponto da série temporal de histórico curto. */
export const historyPointSchema = z.object({
  timestamp: z.string(),
  state: serviceStateSchema,
  cStat: z.number().nullable(),
  latencyMs: z.number(),
  source: statusSourceSchema.optional(),
});
export type HistoryPointDTO = z.infer<typeof historyPointSchema>;

export const historyResponseSchema = z.object({
  id: z.string(),
  period: historyPeriodSchema,
  points: z.array(historyPointSchema),
});
export type HistoryResponseDTO = z.infer<typeof historyResponseSchema>;

/**
 * Arquivo de histórico estático versionado (gerado pelo GitHub Actions e lido
 * pela SPA no modo estático). Mapeia o id do serviço para sua série de pontos.
 */
export const historyFileSchema = z.object({
  updatedAt: z.string(),
  /** `{ "NFe:SP": [ {timestamp,state,cStat,latencyMs}, ... ] }` */
  series: z.record(z.string(), z.array(historyPointSchema)),
});
export type HistoryFileDTO = z.infer<typeof historyFileSchema>;

/** Disponibilidade agregada de um serviço em um período. */
export const uptimeResponseSchema = z.object({
  id: z.string(),
  period: historyPeriodSchema,
  /** Percentual de checagens operacionais no período (0–100). */
  uptime: z.number(),
  totalChecks: z.number(),
  operationalChecks: z.number(),
  avgLatencyMs: z.number().nullable(),
});
export type UptimeResponseDTO = z.infer<typeof uptimeResponseSchema>;

/** Incidente derivado de transições para estado não-operacional. */
export const incidentSchema = z.object({
  serviceId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  worstState: serviceStateSchema,
  lastMotivo: z.string().nullable(),
});
export type IncidentDTO = z.infer<typeof incidentSchema>;

/** Parâmetros de query do endpoint de status. */
export const statusQuerySchema = z.object({
  env: environmentSchema.default('production'),
  document: documentTypeSchema.optional(),
  uf: z.string().length(2).optional(),
});
export type StatusQuery = z.infer<typeof statusQuerySchema>;

export const historyQuerySchema = z.object({
  env: environmentSchema.default('production'),
  period: historyPeriodSchema.default('24h'),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
