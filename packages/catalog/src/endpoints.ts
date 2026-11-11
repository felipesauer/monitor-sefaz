import { DocumentType, type AuthorizerCode, type EnvironmentKey } from './types.js';

/**
 * URL do webservice de "consulta status do serviço" por autorizador e ambiente,
 * para um dado documento.
 *
 * A estrutura é `ENDPOINTS[documento][ambiente][autorizador] = url`.
 *
 * Observação de domínio: NF-e e NFC-e usam o mesmo serviço (`NFeStatusServico4`),
 * mas a maioria dos autorizadores publica a NFC-e num host próprio (`nfce.*`).
 * Perguntar ao host da NF-e não diz nada sobre o da NFC-e, por isso cada uma tem
 * o seu mapa.
 *
 * Fonte: "Relação de Serviços Web" do portal DFe do SVRS (dfe-portal.svrs.rs.gov.br,
 * páginas /Nfe/Servicos e /Nfce/Servicos), conferida em 2026-11-10.
 * Estes valores mudam ocasionalmente; mantê-los aqui (data-only) permite
 * atualizá-los sem tocar no motor de consulta (`@monitor-sefaz/core`).
 */
type EndpointMap = Partial<Record<AuthorizerCode, string>>;
type DocumentEndpoints = Record<EnvironmentKey, EndpointMap>;

const NFE_ENDPOINTS: DocumentEndpoints = {
  production: {
    AM: 'https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico4',
    BA: 'https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
    GO: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    MS: 'https://nfe.sefaz.ms.gov.br/ws/NFeStatusServico4',
    MT: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4',
    PE: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4',
    PR: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    RS: 'https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    SVAN: 'https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVRS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SVCAN: 'https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVCRS: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    AN: 'https://www.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
  homologation: {
    AM: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4',
    BA: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx',
    GO: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    MS: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeStatusServico4',
    MT: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4',
    PE: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4',
    PR: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4',
    RS: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    SVAN: 'https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SVCAN: 'https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
    SVCRS: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    AN: 'https://hom.nfe.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
  },
};

/**
 * Endpoints NFC-e (modelo 65), por autorizador próprio e SVRS. Os hosts são os
 * da NFC-e, não os da NF-e. MG não aparece na relação do SVRS; a URL dele vem do
 * nfephp-org/sped-nfe (storage/wsnfe_4.00_mod65.xml), fonte secundária.
 */
const NFCE_ENDPOINTS: DocumentEndpoints = {
  production: {
    AM: 'https://nfce.sefaz.am.gov.br/nfce-services/services/NfeStatusServico4',
    GO: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://nfce.fazenda.mg.gov.br/nfce/services/NFeStatusServico4',
    MS: 'https://nfce.sefaz.ms.gov.br/ws/NFeStatusServico4',
    MT: 'https://nfce.sefaz.mt.gov.br/nfcews/services/NfeStatusServico4',
    PR: 'https://nfce.sefa.pr.gov.br/nfce/NFeStatusServico4',
    RS: 'https://nfce.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SP: 'https://nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    SVRS: 'https://nfce.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
  homologation: {
    AM: 'https://homnfce.sefaz.am.gov.br/nfce-services/services/NfeStatusServico4',
    GO: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4',
    MG: 'https://hnfce.fazenda.mg.gov.br/nfce/services/NFeStatusServico4',
    MS: 'https://hom.nfce.sefaz.ms.gov.br/ws/NFeStatusServico4',
    MT: 'https://homologacao.sefaz.mt.gov.br/nfcews/services/NfeStatusServico4',
    PR: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeStatusServico4',
    RS: 'https://nfce-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    SP: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    SVRS: 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
  },
};

/**
 * Endpoints CT-e (`CTeStatusServico`, v4.00). Estados com autorizador próprio
 * mantêm sua URL; AP, PE e RR usam a SVSP e os demais o SVRS. Fonte: "Relação de
 * Serviços Web" do portal DFe do SVRS (/Cte/Servicos), conferida em 2026-11-10.
 */
const CTE_ENDPOINTS: DocumentEndpoints = {
  production: {
    MG: 'https://cte.fazenda.mg.gov.br/cte/services/CTeStatusServicoV4',
    MS: 'https://producao.cte.ms.gov.br/ws/CTeStatusServicoV4',
    MT: 'https://cte.sefaz.mt.gov.br/ctews2/services/CTeStatusServicoV4',
    PR: 'https://cte.fazenda.pr.gov.br/cte4/CTeStatusServicoV4',
    RS: 'https://cte.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx',
    // A SVSP roda na infraestrutura da SEFAZ-SP: mesmo endereço do SP.
    SVSP: 'https://nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx',
    SVRS: 'https://cte.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SVCRS: 'https://cte.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SVCAN: 'https://www.cte.fazenda.gov.br/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    AN: 'https://www.cte.fazenda.gov.br/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
  },
  homologation: {
    MG: 'https://hcte.fazenda.mg.gov.br/cte/services/CTeStatusServicoV4',
    MS: 'https://homologacao.cte.ms.gov.br/ws/CTeStatusServicoV4',
    MT: 'https://homologacao.sefaz.mt.gov.br/ctews2/services/CTeStatusServicoV4',
    PR: 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeStatusServicoV4',
    RS: 'https://cte-homologacao.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx',
    SVSP: 'https://homologacao.nfe.fazenda.sp.gov.br/CTeWS/WS/CTeStatusServicoV4.asmx',
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
 * Endpoints BP-e (Bilhete de Passagem Eletrônico, `BPeStatusServico`, v1.00).
 * MG, MS, MT, PR e SP têm autorizador próprio; as demais UFs usam o SVRS.
 * Fonte: "Relação de Serviços Web" do Portal do BP-e. A homologação de MG que o
 * portal publica para o status aponta para o `BPeConsulta` (erro do portal); a
 * URL abaixo segue o padrão dos demais serviços de MG, como no nfephp-org/sped-bpe.
 */
const BPE_ENDPOINTS: DocumentEndpoints = {
  production: {
    MG: 'https://bpe.fazenda.mg.gov.br/bpe/services/BPeStatusServico',
    MS: 'https://bpe.fazenda.ms.gov.br/ws/BPeStatusServico',
    MT: 'https://www.sefaz.mt.gov.br/bpe-ws/services/BPeStatusServico',
    PR: 'https://bpe.fazenda.pr.gov.br/bpe/BPeStatusServico',
    SP: 'https://bpe.fazenda.sp.gov.br/BPeWeb/services/BPeStatusServico.asmx',
    SVRS: 'https://bpe.svrs.rs.gov.br/ws/bpeStatusServico/bpeStatusServico.asmx',
  },
  homologation: {
    MG: 'https://hbpe.fazenda.mg.gov.br/bpe/services/BPeStatusServico',
    MS: 'https://homologacao.bpe.ms.gov.br/ws/BPeStatusServico',
    MT: 'https://homologacao.sefaz.mt.gov.br/bpe-ws/services/BPeStatusServico',
    PR: 'https://homologacao.bpe.fazenda.pr.gov.br/bpe/BPeStatusServico',
    SP: 'https://homologacao.bpe.fazenda.sp.gov.br/BPeWeb/services/BPeStatusServico.asmx',
    SVRS: 'https://bpe-homologacao.svrs.rs.gov.br/ws/bpeStatusServico/bpeStatusServico.asmx',
  },
};

/** Registro de endpoints por documento. */
export const ENDPOINTS: Readonly<Record<DocumentType, DocumentEndpoints>> = {
  [DocumentType.NFe]: NFE_ENDPOINTS,
  [DocumentType.NFCe]: NFCE_ENDPOINTS,
  [DocumentType.CTe]: CTE_ENDPOINTS,
  [DocumentType.MDFe]: MDFE_ENDPOINTS,
  [DocumentType.DCe]: DCE_ENDPOINTS,
  [DocumentType.BPe]: BPE_ENDPOINTS,
};
