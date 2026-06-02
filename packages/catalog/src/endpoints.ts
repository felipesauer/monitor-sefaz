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
  producao: {
    AM: 'https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico2',
    BA: 'https://nfe.sefaz.ba.gov.br/webservices/NfeStatusServico2/NfeStatusServico2.asmx',
    CE: 'https://nfe.sefaz.ce.gov.br/nfe2/services/NFeStatusServico4',
    GO: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    MS: 'https://nfe.sefaz.ms.gov.br/ws2/NfeStatusServico2.asmx',
    MT: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/Nfews',
    PA: 'https://app.sefa.pa.gov.br/sfz-nfe-web/webservices/NfeStatusServico2',
    PE: 'https://nfenw.sefaz.pe.gov.br/ws/NfeStatusServico2.asmx',
    PR: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    RS: 'https://nfe.sefazrs.rs.gov.br/ws/NfeStatus/NfeStatus2.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/ws/nfestatus.asmx',
    SVAN: 'https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVRS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatus/NfeStatus2.asmx',
    SVCAN: 'https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVCRS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatus/NfeStatus2.asmx',
    AN: 'https://www.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
  homologacao: {
    AM: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico2',
    BA: 'https://hnfe.sefaz.ba.gov.br/webservices/NfeStatusServico2/NfeStatusServico2.asmx',
    CE: 'https://nfeh.sefaz.ce.gov.br/nfe2/services/NFeStatusServico4',
    GO: 'https://homologacao.nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    MS: 'https://homologacao.nfe.sefaz.ms.gov.br/ws2/NfeStatusServico2.asmx',
    MT: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/Nfews',
    PA: 'https://app.sefa.pa.gov.br/sfz-nfe-web-hml/webservices/NfeStatusServico2',
    PE: 'https://nfehomolog.sefaz.pe.gov.br/ws/NfeStatusServico2.asmx',
    PR: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    RS: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatus/NfeStatus2.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatus.asmx',
    SVAN: 'https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatus/NfeStatus2.asmx',
    SVCAN: 'https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVCRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatus/NfeStatus2.asmx',
    AN: 'https://hom.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
};

/**
 * Registro de endpoints por documento. NFC-e reaproveita o webservice da NF-e
 * na consulta de status. CT-e/MDF-e/DC-e serão preenchidos na expansão (Fase 4).
 */
export const ENDPOINTS: Readonly<Record<DocumentType, DocumentEndpoints>> = {
  [DocumentType.NFe]: NFE_ENDPOINTS,
  [DocumentType.NFCe]: NFE_ENDPOINTS,
  [DocumentType.CTe]: { producao: {}, homologacao: {} },
  [DocumentType.MDFe]: { producao: {}, homologacao: {} },
  [DocumentType.DCe]: { producao: {}, homologacao: {} },
};
