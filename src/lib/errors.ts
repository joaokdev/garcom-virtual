/**
 * Erro de aplicação com código HTTP associado, usado para que as rotas de
 * API retornem respostas consistentes e mensagens seguras (nunca expondo
 * detalhes internos) ao cliente.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados inválidos.") {
    super(message, 422, "VALIDATION_ERROR");
  }
}
