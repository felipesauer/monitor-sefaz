import { DocumentType, type AuthorizerCode, type EnvironmentKey } from './types.js';

/**
 * URL do webservice de "consulta status do serviço" por autorizador e ambiente,
 * para um dado documento.
 *
 * A estrutura é `ENDPOINTS[documento][ambiente][autorizador] = url`.
 *
 * Observação de domínio: na consulta de status, NF-e e NFC-e compartilham o
 * mesmo webservice (`NFeStatusServico4`) — diferem apenas no modelo do documento
 * autorizado (55 vs 65). Por isso o mapa de NFC-e reaproveita as URLs da NF-e.
 *
 * Fonte: Manual de Orientação do Contribuinte (MOC) e portais das SEFAZ.
 * Estes valores mudam ocasionalmente; mantê-los aqui (data-only) permite
 * atualizá-los sem tocar no motor de consulta (`@monitor-sefaz/core`).
 */
type EndpointMap = Partial<Record<AuthorizerCode, string>>;
type DocumentEndpoints = Record<EnvironmentKey, EndpointMap>;

const NFE_ENDPOINTS: DocumentEndpoints = {
  production: {
    AM: 'https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico2',
    BA: 'https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
    CE: 'https://nfe.sefaz.ce.gov.br/nfe2/services/NFeStatusServico4',
    GO: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    MS: 'https://nfe.sefaz.ms.gov.br/ws/NFeStatusServico4',
    MT: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/Nfews',
    PA: 'https://app.sefa.pa.gov.br/sfz-nfe-web/webservices/NfeStatusServico2',
    PE: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4',
    PR: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    RS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    SVAN: 'https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVRS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SVCAN: 'https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVCRS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    AN: 'https://www.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
  homologation: {
    AM: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico2',
    BA: 'https://hnfe.sefaz.ba.gov.br/webservices/NfeStatusServico2/NfeStatusServico2.asmx',
    CE: 'https://nfeh.sefaz.ce.gov.br/nfe2/services/NFeStatusServico4',
    GO: 'https://homologacao.nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    MS: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeStatusServico4',
    MT: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/Nfews',
    PA: 'https://app.sefa.pa.gov.br/sfz-nfe-web-hml/webservices/NfeStatusServico2',
    PE: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4',
    PR: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    RS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    SVAN: 'https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SVCAN: 'https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVCRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    AN: 'https://hom.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
};

/**
 * Endpoints CT-e (`CTeStatusServico`, v4.00). Estados com autorizador próprio
 * mantêm sua URL; os demais usam o SVRS. Lista expansível conforme o MOC CT-e.
 */
const CTE_ENDPOINTS: DocumentEndpoints = {
  production: {
    MG: 'https://cte.fazenda.mg.gov.br/cte/services/CTeStatusServicoV4',
    MS: 'https://producao.cte.ms.gov.br/ws/CTeStatusServicoV4',
    MT: 'https://cte.sefaz.mt.gov.br/ctews2/services/CTeStatusServicoV4',
    PR: 'https://cte.fazenda.pr.gov.br/cte4/CTeStatusServicoV4',
    RS: 'https://cte.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx',
    SVRS: 'https://cte.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SVCRS: 'https://cte.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SVCAN: 'https://www.cte.fazenda.gov.br/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    AN: 'https://www.cte.fazenda.gov.br/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
  },
  homologation: {
    MG: 'https://hcte.fazenda.mg.gov.br/cte/services/CTeStatusServicoV4',
    MS: 'https://homologacao.cte.ms.gov.br/ws/CTeStatusServicoV4',
    MT: 'https://homologacao.cte.sefaz.mt.gov.br/ctews2/services/CTeStatusServicoV4',
    PR: 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeStatusServicoV4',
    RS: 'https://cte-homologacao.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx',
    SVRS: 'https://cte-homologacao.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SVCRS: 'https://cte-homologacao.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SVCAN: 'https://hom.cte.fazenda.gov.br/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    AN: 'https://hom.cte.fazenda.gov.br/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
  },
};

/**
 * Endpoints MDF-e (`MDFeStatusServico`, v3.00). O MDF-e é centralizado: a
 * maioria das UFs é atendida pelo SVRS, além do ambiente nacional.
 */
const MDFE_ENDPOINTS: DocumentEndpoints = {
  production: {
    SVRS: 'https://mdfe.svrs.rs.gov.br/ws/MDFeStatusServico/MDFeStatusServico.asmx',
    AN: 'https://www.mdfe.fazenda.gov.br/MDFeStatusServico/MDFeStatusServico.asmx',
  },
  homologation: {
    SVRS: 'https://mdfe-homologacao.svrs.rs.gov.br/ws/MDFeStatusServico/MDFeStatusServico.asmx',
    AN: 'https://hom.mdfe.fazenda.gov.br/MDFeStatusServico/MDFeStatusServico.asmx',
  },
};

/**
 * Endpoints DC-e (Declaração de Conteúdo eletrônica). Documento novo: o ambiente
 * nacional da DC-e passou a ser hospedado pela SEFAZ-PR (`dce.fazenda.pr.gov.br`),
 * não mais em `dce.svrs.rs.gov.br` (host descontinuado). O autorizador continua
 * sendo o SVRS no catálogo (mapa UF→autorizador), só a URL do WS migrou.
 */
const DCE_ENDPOINTS: DocumentEndpoints = {
  production: {
    SVRS: 'https://dce.fazenda.pr.gov.br/dce/DCeStatusServico',
  },
  homologation: {
    SVRS: 'https://homologacao.dce.fazenda.pr.gov.br/dce/DCeStatusServico',
  },
};

/**
 * Registro de endpoints por documento. NFC-e reaproveita o webservice da NF-e
 * na consulta de status.
 */
export const ENDPOINTS: Readonly<Record<DocumentType, DocumentEndpoints>> = {
  [DocumentType.NFe]: NFE_ENDPOINTS,
  [DocumentType.NFCe]: NFE_ENDPOINTS,
  [DocumentType.CTe]: CTE_ENDPOINTS,
  [DocumentType.MDFe]: MDFE_ENDPOINTS,
  [DocumentType.DCe]: DCE_ENDPOINTS,
};
