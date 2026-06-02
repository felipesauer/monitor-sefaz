import type { UF, UFInfo } from './types.js';

/**
 * Metadados das 27 UFs: código IBGE (`cUF`) e nome por extenso.
 * Fonte: tabela de códigos de UF do IBGE / Manual de Orientação do Contribuinte.
 */
export const UF_INFO: Readonly<Record<UF, UFInfo>> = {
  AC: { cUF: 12, nome: 'Acre' },
  AL: { cUF: 27, nome: 'Alagoas' },
  AP: { cUF: 16, nome: 'Amapá' },
  AM: { cUF: 13, nome: 'Amazonas' },
  BA: { cUF: 29, nome: 'Bahia' },
  CE: { cUF: 23, nome: 'Ceará' },
  DF: { cUF: 53, nome: 'Distrito Federal' },
  ES: { cUF: 32, nome: 'Espírito Santo' },
  GO: { cUF: 52, nome: 'Goiás' },
  MA: { cUF: 21, nome: 'Maranhão' },
  MG: { cUF: 31, nome: 'Minas Gerais' },
  MS: { cUF: 50, nome: 'Mato Grosso do Sul' },
  MT: { cUF: 51, nome: 'Mato Grosso' },
  PA: { cUF: 15, nome: 'Pará' },
  PB: { cUF: 25, nome: 'Paraíba' },
  PE: { cUF: 26, nome: 'Pernambuco' },
  PI: { cUF: 22, nome: 'Piauí' },
  PR: { cUF: 41, nome: 'Paraná' },
  RJ: { cUF: 33, nome: 'Rio de Janeiro' },
  RN: { cUF: 24, nome: 'Rio Grande do Norte' },
  RO: { cUF: 11, nome: 'Rondônia' },
  RR: { cUF: 14, nome: 'Roraima' },
  RS: { cUF: 43, nome: 'Rio Grande do Sul' },
  SC: { cUF: 42, nome: 'Santa Catarina' },
  SE: { cUF: 28, nome: 'Sergipe' },
  SP: { cUF: 35, nome: 'São Paulo' },
  TO: { cUF: 17, nome: 'Tocantins' },
};

/** Lista de todas as siglas de UF conhecidas. */
export const ALL_UFS = Object.keys(UF_INFO) as UF[];
