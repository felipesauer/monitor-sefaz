import { z } from 'zod';
import {
  documentTypeSchema,
  environmentSchema,
  serviceStateSchema,
  statusSourceSchema,
} from './schemas.js';

/**
 * Camada de DETALHE do painel: o estado de cada operação (Autorização, Consulta,
 * Evento, Status…) de cada autorizador, por ambiente, como a fonte o publica.
 *
 * É um conjunto à parte do snapshot `documento:UF`, que continua sendo o
 * cabeçalho do painel (o estado de "Status Serviço"). Aqui a chave é o
 * autorizador, não a UF: o SVRS publica uma linha por webservice de cada
 * autorizador, e a página da Receita uma coluna por serviço. `ufs` diz quem cai
 * junto quando aquele autorizador falha.
 */

/** Uma operação de um autorizador, como a fonte a publica. */
export const operationStatusSchema = z.object({
  /** Rótulo da fonte: "WS Autorizacao" (SVRS), "Autorização4" (Receita)… */
  operation: z.string(),
  state: serviceStateSchema,
  /** cStat publicado pela fonte (só o SVRS publica). */
  cStat: z.number().nullable(),
  /** Horário "HH:MM:SS" da aferição pela fonte (só o SVRS publica). */
  sourceCheckedAt: z.string().optional(),
});
export type OperationStatusDTO = z.infer<typeof operationStatusSchema>;

/** As operações de um autorizador num documento e ambiente, segundo uma fonte. */
export const authorizerDetailSchema = z.object({
  document: documentTypeSchema,
  /** Código do autorizador: a UF (autorizador próprio) ou SVRS, SVAN, SVCAN… */
  authorizer: z.string(),
  environment: environmentSchema,
  source: statusSourceSchema,
  /** UFs que esse autorizador atende neste documento, segundo o catálogo. */
  ufs: z.array(z.string()),
  operations: z.array(operationStatusSchema),
});
export type AuthorizerDetailDTO = z.infer<typeof authorizerDetailSchema>;

/** O arquivo `details.json`: todos os autorizadores lidos numa coleta. */
export const detailSnapshotSchema = z.object({
  generatedAt: z.string(),
  authorizers: z.array(authorizerDetailSchema),
});
export type DetailSnapshotDTO = z.infer<typeof detailSnapshotSchema>;
