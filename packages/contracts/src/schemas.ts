import { z } from 'zod';
import { DocumentType, Environment } from '@monitor-sefaz/catalog';

// Reexporta os enums de domínio para que o front consuma tudo de um só pacote.
export { DocumentType, Environment } from '@monitor-sefaz/catalog';

/** Enum Zod para os tipos de documento. */
export const documentTypeSchema = z.nativeEnum(DocumentType);

/** Estado normalizado do serviço (espelha `ServiceState` do core). */
export const serviceStateSchema = z.enum(['OPERATIONAL', 'SLOWDOWN', 'DOWN', 'ERROR']);
export type ServiceStateValue = z.infer<typeof serviceStateSchema>;

/** Ambiente em formato textual usado na API. */
export const environmentSchema = z.enum(['producao', 'homologacao']);
export type EnvironmentValue = z.infer<typeof environmentSchema>;

/** Converte a chave textual de ambiente para o enum numérico do core. */
export function toEnvironment(value: EnvironmentValue): Environment {
  return value === 'producao' ? Environment.Production : Environment.Homologation;
}

/** Converte o enum numérico do core para a chave textual da API. */
export function fromEnvironment(env: Environment): EnvironmentValue {
  return env === Environment.Production ? 'producao' : 'homologacao';
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
  error: z.string().nullable(),
  checkedAt: z.string(), // ISO 8601
});
export type ServiceStatusDTO = z.infer<typeof serviceStatusSchema>;

/** Snapshot completo de um ambiente. */
export const statusSnapshotSchema = z.object({
  environment: environmentSchema,
  generatedAt: z.string(),
  services: z.array(serviceStatusSchema),
});
export type StatusSnapshotDTO = z.infer<typeof statusSnapshotSchema>;

/** Resumo agregado de disponibilidade. */
export const summaryGroupSchema = z.object({
  key: z.string(),
  total: z.number(),
  operational: z.number(),
  availability: z.number(),
});

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
});
export type SummaryDTO = z.infer<typeof summarySchema>;

/** Períodos suportados pela consulta de histórico curto. */
export const historyPeriodSchema = z.enum(['1h', '6h', '24h', '72h']);
export type HistoryPeriod = z.infer<typeof historyPeriodSchema>;

/** Ponto da série temporal de histórico curto. */
export const historyPointSchema = z.object({
  timestamp: z.string(),
  state: serviceStateSchema,
  cStat: z.number().nullable(),
  latencyMs: z.number(),
});
export type HistoryPointDTO = z.infer<typeof historyPointSchema>;

export const historyResponseSchema = z.object({
  id: z.string(),
  period: historyPeriodSchema,
  points: z.array(historyPointSchema),
});
export type HistoryResponseDTO = z.infer<typeof historyResponseSchema>;

/** Parâmetros de query do endpoint de status. */
export const statusQuerySchema = z.object({
  env: environmentSchema.default('producao'),
  document: documentTypeSchema.optional(),
  uf: z.string().length(2).optional(),
});
export type StatusQuery = z.infer<typeof statusQuerySchema>;

export const historyQuerySchema = z.object({
  env: environmentSchema.default('producao'),
  period: historyPeriodSchema.default('24h'),
});
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
