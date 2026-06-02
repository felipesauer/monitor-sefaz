/** Erro base do parsing/consulta SEFAZ. */
export class SefazError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A resposta era HTML (erro 403/503, redirect, WAF) em vez de XML SOAP. */
export class HtmlResponseError extends SefazError {
  constructor() {
    super('Servidor retornou HTML (possível erro 403/503 ou redirect)');
  }
}

/** A resposta era um SOAP Fault. */
export class SoapFaultError extends SefazError {
  constructor(detail: string) {
    super(`SOAP Fault: ${detail}`);
  }
}

/** O corpo não pôde ser parseado como XML. */
export class InvalidXmlError extends SefazError {
  constructor(detail: string) {
    super(`XML inválido: ${detail}`);
  }
}

/** O nó de retorno esperado (ex: retConsStatServ) não foi encontrado. */
export class MissingStatusNodeError extends SefazError {
  constructor(retNodeName: string) {
    super(`${retNodeName} não encontrado na resposta`);
  }
}
