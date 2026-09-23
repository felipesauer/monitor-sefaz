import type { Region, UF, UFInfo } from './types.js';

/**
 * Metadados das 27 UFs: código IBGE (`cUF`), nome por extenso e região.
 * Fonte: tabela de códigos de UF do IBGE / Manual de Orientação do Contribuinte.
 */
export const UF_INFO: Readonly<Record<UF, UFInfo>> = {
  AC: { cUF: 12, nome: 'Acre', regiao: 'Norte' },
  AL: { cUF: 27, nome: 'Alagoas', regiao: 'Nordeste' },
  AP: { cUF: 16, nome: 'Amapá', regiao: 'Norte' },
  AM: { cUF: 13, nome: 'Amazonas', regiao: 'Norte' },
  BA: { cUF: 29, nome: 'Bahia', regiao: 'Nordeste' },
  CE: { cUF: 23, nome: 'Ceará', regiao: 'Nordeste' },
  DF: { cUF: 53, nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  ES: { cUF: 32, nome: 'Espírito Santo', regiao: 'Sudeste' },
  GO: { cUF: 52, nome: 'Goiás', regiao: 'Centro-Oeste' },
  MA: { cUF: 21, nome: 'Maranhão', regiao: 'Nordeste' },
  MG: { cUF: 31, nome: 'Minas Gerais', regiao: 'Sudeste' },
  MS: { cUF: 50, nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  MT: { cUF: 51, nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  PA: { cUF: 15, nome: 'Pará', regiao: 'Norte' },
  PB: { cUF: 25, nome: 'Paraíba', regiao: 'Nordeste' },
  PE: { cUF: 26, nome: 'Pernambuco', regiao: 'Nordeste' },
  PI: { cUF: 22, nome: 'Piauí', regiao: 'Nordeste' },
  PR: { cUF: 41, nome: 'Paraná', regiao: 'Sul' },
  RJ: { cUF: 33, nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  RN: { cUF: 24, nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  RO: { cUF: 11, nome: 'Rondônia', regiao: 'Norte' },
  RR: { cUF: 14, nome: 'Roraima', regiao: 'Norte' },
  RS: { cUF: 43, nome: 'Rio Grande do Sul', regiao: 'Sul' },
  SC: { cUF: 42, nome: 'Santa Catarina', regiao: 'Sul' },
  SE: { cUF: 28, nome: 'Sergipe', regiao: 'Nordeste' },
  SP: { cUF: 35, nome: 'São Paulo', regiao: 'Sudeste' },
  TO: { cUF: 17, nome: 'Tocantins', regiao: 'Norte' },
};

/** Lista de todas as siglas de UF conhecidas. */
export const ALL_UFS = Object.keys(UF_INFO) as UF[];

/**
 * As cinco regiões na ordem do IBGE, que é o primeiro dígito do `cUF`
 * (1 = Norte, 2 = Nordeste, 3 = Sudeste, 4 = Sul, 5 = Centro-Oeste).
 */
export const REGIONS: readonly Region[] = ['Norte', 'Nordeste', 'Sudeste', 'Sul', 'Centro-Oeste'];
