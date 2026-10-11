import type { ApiError } from './apiError.ts'

/** Mensagem exibida no formulário de login para cada tipo de falha. */
export function getLoginErrorMessage(error: ApiError): string {
  if (error.kind === 'http' && (error.status === 400 || error.status === 401)) {
    return error.serverMessage === 'Username and password required'
      ? 'Informe usuário e senha.'
      : 'Usuário ou senha inválidos.'
  }
  return error.message
}

export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou ou não é mais válida. Entre novamente para continuar.'
