/** Rótulos amigáveis de UF e documento para a interface. */

export const UF_NAME: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
};

/** Rótulo de exibição de cada documento (com hífen, como o público espera). */
export const DOC_LABEL: Record<string, string> = {
  NFe: 'NF-e',
  NFCe: 'NFC-e',
  CTe: 'CT-e',
  MDFe: 'MDF-e',
  DCe: 'DC-e',
};

/** Formata latência em ms para exibição (ex: 1500 → "1.5 s", 240 → "240 ms"). */
export function formatLatency(ms: number): { value: string; unit: string } {
  if (ms <= 0) return { value: '—', unit: '' };
  if (ms >= 1000) return { value: (ms / 1000).toFixed(1), unit: 's' };
  return { value: String(ms), unit: 'ms' };
}
