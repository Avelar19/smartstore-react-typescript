import { isAxiosError, isCancel } from 'axios'
import { z } from 'zod'

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'validation' | 'canceled' | 'unknown'

interface ApiErrorOptions {
  status?: number
  /** Mensagem original retornada pela API (em inglês), útil para depuração e regras específicas. */
  serverMessage?: string
  cause?: unknown
}

/** Erro normalizado da camada de API, com mensagem amigável em português. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly serverMessage: string | undefined

  constructor(kind: ApiErrorKind, message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
    this.serverMessage = options.serverMessage
  }
}

const serverMessageSchema = z.object({ message: z.string() })

function getHttpErrorMessage(status: number): string {
  if (status === 401 || status === 403) return 'Você não tem permissão para acessar este recurso.'
  if (status === 404) return 'O recurso solicitado não foi encontrado.'
  if (status === 429) return 'Muitas requisições em sequência. Aguarde alguns instantes e tente novamente.'
  if (status >= 500) return 'O servidor está indisponível no momento. Tente novamente mais tarde.'
  return `Não foi possível concluir a requisição (erro ${status}).`
}

/** Converte qualquer falha (Axios, rede, timeout, cancelamento) em ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isCancel(error)) {
    return new ApiError('canceled', 'A requisição foi cancelada.', { cause: error })
  }

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', 'O servidor demorou demais para responder. Tente novamente.', {
        cause: error,
      })
    }

    if (error.response) {
      const { status } = error.response
      const responseBody: unknown = error.response.data
      const serverMessage = serverMessageSchema.safeParse(responseBody)
      return new ApiError('http', getHttpErrorMessage(status), {
        status,
        cause: error,
        ...(serverMessage.success && { serverMessage: serverMessage.data.message }),
      })
    }

    return new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.', {
      cause: error,
    })
  }

  return new ApiError('unknown', 'Ocorreu um erro inesperado.', { cause: error })
}
