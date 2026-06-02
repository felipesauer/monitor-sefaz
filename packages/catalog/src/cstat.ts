/**
 * Códigos de status (`cStat`) retornados pela consulta de status do serviço.
 * Referência: NT 2014.002 — consulta status do serviço.
 */
export const CSTAT: Readonly<Record<number, string>> = {
  107: 'Serviço em Operação',
  108: 'Serviço Paralisado Momentaneamente',
  109: 'Serviço Paralisado sem Previsão',
};

/** `cStat` que indica serviço plenamente operacional. */
export const CSTAT_OPERATIONAL = 107;

/** `cStat` que indica paralisação momentânea (degradação). */
export const CSTAT_SLOWDOWN = 108;

/** `cStat` que indica paralisação sem previsão (indisponível). */
export const CSTAT_DOWN = 109;
