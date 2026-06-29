import * as cheerio from 'cheerio';
import { ServiceState } from '../domain/types.js';

/**
 * Autorizador exposto na página de disponibilidade do SVRS. A página da NF-e tem
 * duas seções (SEFAZ-RS e SVRS); as de CT-e/MDF-e têm só o autorizador virtual.
 */
export type SvrsAuthorizer = 'SEFAZ-RS' | 'SVRS';

/** Status de UM webservice (operação) de um autorizador, como o SVRS publica. */
export interface SvrsWebService {
  /** Operação, ex.: "WS Autorizacao", "WS Status", "WS Consulta Situacao". */
  readonly operation: string;
  readonly state: ServiceState;
  /** `cStat` reportado pelo SVRS (107/106/215/...), ou null se ausente. */
  readonly cStat: number | null;
  /** Horário "HH:MM:SS" da última verificação do SVRS, ou null. */
  readonly lastCheckTime: string | null;
}

/** Status agregado de um autorizador (todos os WS daquela seção). */
export interface SvrsAuthorizerStatus {
  readonly authorizer: SvrsAuthorizer;
  /** Estado geral do autorizador, derivado dos seus webservices. */
  readonly state: ServiceState;
  /** `cStat` do "WS Status" (consulta de status do serviço), quando presente. */
  readonly cStat: number | null;
  /** Horário "HH:MM:SS" mais recente entre os WS do autorizador. */
  readonly lastCheckTime: string | null;
  readonly webServices: SvrsWebService[];
}

/**
 * Mapeia a cor do ícone de status do SVRS para um `ServiceState`. O SVRS usa um
 * `<i class="fa fa-check-circle" style="color: #3c763d">` (verde) para normal e
 * cores quentes para degradação/erro.
 */
function colorToState(style: string): ServiceState {
  const s = style.toLowerCase();
  if (s.includes('#3c763d') || s.includes('3c763d')) return ServiceState.Operational; // verde
  if (s.includes('#8a6d3b') || s.includes('#f0ad4e') || s.includes('orange') || s.includes('#ec971f')) {
    return ServiceState.SlowDown; // âmbar/laranja — degradação
  }
  if (s.includes('#a94442') || s.includes('#d9534f') || s.includes('red')) {
    return ServiceState.Down; // vermelho — parada
  }
  return ServiceState.Error;
}

/** Agrega o estado de um autorizador a partir dos seus webservices. */
function aggregateState(webServices: SvrsWebService[]): ServiceState {
  if (webServices.length === 0) return ServiceState.Error;
  // Pior caso vence (conservador): se qualquer WS caiu, o autorizador não está
  // 100%. Ordem de severidade: Down > SlowDown > Error > Operational.
  if (webServices.some((w) => w.state === ServiceState.Down)) return ServiceState.Down;
  if (webServices.some((w) => w.state === ServiceState.SlowDown)) return ServiceState.SlowDown;
  if (webServices.every((w) => w.state === ServiceState.Operational)) return ServiceState.Operational;
  // Algum WS em Error mas nenhum Down/SlowDown: trata como degradação.
  return webServices.some((w) => w.state === ServiceState.Operational)
    ? ServiceState.SlowDown
    : ServiceState.Error;
}

const CSTAT_RE = /CStat:\s*(\d+)/i;
const TIME_RE = /(\d{2}:\d{2}:\d{2})/;
/** Nome da operação de status do serviço — usado para o cStat representativo. */
const STATUS_OP_RE = /\bWS\s+Status\b/i;

/**
 * Parser da página pública de disponibilidade do SVRS
 * (`dfe-portal.svrs.rs.gov.br/<Doc>/Disponibilidade`).
 *
 * Diferente da página oficial da Receita (bolinhas coloridas por coluna), o SVRS
 * renderiza, por autorizador, uma tabela com uma linha por webservice contendo o
 * nome da operação, um ícone colorido de status, o `cStat` real e o horário da
 * última verificação. É fonte OFICIAL e não exige certificado A1.
 *
 * Layout observado:
 * - NF-e: duas seções `<h4>SEFAZ-RS</h4>` e `<h4>SEFAZ Virtual do RS</h4>`, cada
 *   uma com sua `<table>` de webservices.
 * - CT-e/MDF-e: uma única tabela de webservices (só o autorizador virtual SVRS).
 */
export class SvrsParser {
  public parse(html: string): SvrsAuthorizerStatus[] {
    const $ = cheerio.load(html);
    const out: SvrsAuthorizerStatus[] = [];

    // Cada bloco "col-sm-6" com um <h4> identifica uma seção de autorizador (NF-e).
    // Quando não há <h4> (CT-e/MDF-e), a página inteira é o autorizador SVRS.
    const headers = $('h4').toArray();
    let matchedSection = false;
    for (const h of headers) {
      const authorizer = titleToAuthorizer($(h).text().trim());
      if (!authorizer) {
        continue;
      }
      matchedSection = true;
      // A tabela de WS é a primeira <table> dentro da mesma coluna do <h4>.
      const table = $(h).closest('.col-sm-6').find('table').first();
      const webServices = this.parseWebServices($, table);
      if (webServices.length > 0) {
        out.push(this.toAuthorizerStatus(authorizer, webServices));
      }
    }

    if (matchedSection) {
      return out;
    }

    // Sem <h4> de autorizador: assume a primeira tabela de webservices como SVRS.
    const table = $('table.table-hover').first();
    const webServices = this.parseWebServices($, table);
    if (webServices.length > 0) {
      out.push(this.toAuthorizerStatus('SVRS', webServices));
    }
    return out;
  }

  private parseWebServices(
    $: cheerio.CheerioAPI,
    table: ReturnType<cheerio.CheerioAPI>
  ): SvrsWebService[] {
    const webServices: SvrsWebService[] = [];
    table.find('tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length < 2) return;

      const label = cells.eq(1).find('b').first().text().trim();
      if (!/^WS\s+/i.test(label)) return; // não é uma linha de webservice

      const detail = cells.eq(1).text();
      const cStatMatch = detail.match(CSTAT_RE);
      const timeMatch = detail.match(TIME_RE);
      const style = cells.eq(0).find('i').attr('style') ?? '';

      webServices.push({
        operation: label,
        state: colorToState(style),
        cStat: cStatMatch?.[1] ? Number.parseInt(cStatMatch[1], 10) : null,
        lastCheckTime: timeMatch?.[1] ?? null,
      });
    });
    return webServices;
  }

  private toAuthorizerStatus(
    authorizer: SvrsAuthorizer,
    webServices: SvrsWebService[]
  ): SvrsAuthorizerStatus {
    const statusWs = webServices.find((w) => STATUS_OP_RE.test(w.operation));
    const times = webServices.map((w) => w.lastCheckTime).filter((t): t is string => t !== null);
    return {
      authorizer,
      state: aggregateState(webServices),
      // cStat representativo: o do "WS Status"; senão o primeiro disponível.
      cStat: statusWs?.cStat ?? webServices.find((w) => w.cStat !== null)?.cStat ?? null,
      lastCheckTime: times.length > 0 ? times.sort().at(-1)! : null,
      webServices,
    };
  }
}

/** Mapeia o título da seção SVRS para o autorizador canônico. */
function titleToAuthorizer(title: string): SvrsAuthorizer | null {
  const t = title.toUpperCase();
  if (t.includes('SEFAZ-RS') || t === 'SEFAZ RS') return 'SEFAZ-RS';
  if (t.includes('VIRTUAL') || t.includes('SVRS')) return 'SVRS';
  return null;
}
