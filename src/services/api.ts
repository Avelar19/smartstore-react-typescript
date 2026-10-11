import axios, { isAxiosError } from 'axios'

import { toApiError } from './apiError.ts'
import { getAccessToken } from './tokenStorage.ts'

export const API_BASE_URL = 'https://dummyjson.com'
export const API_TIMEOUT_MS = 10_000

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Quando true, um 401 desta requisição não aciona o encerramento global da sessão. */
    skipUnauthorizedHandler?: boolean
  }
}

/** Instância única do Axios usada por todos os serviços da aplicação. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
})

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** Registrado pelo AuthProvider para encerrar a sessão quando o token for recusado (HTTP 401). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

// Adiciona o JWT da sessão no cabeçalho Authorization, sem sobrescrever um cabeçalho explícito.
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/**
 * Um 401 só encerra a sessão se a requisição foi enviada com o token da sessão atual.
 * Requisições públicas, de login ou com outro token não afetam a sessão.
 */
function isCurrentSessionRejected(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) return false
  if (error.config.skipUnauthorizedHandler) return false

  const token = getAccessToken()
  return token !== null && error.config.headers.get('Authorization') === `Bearer ${token}`
}

// Normaliza falhas de rede, timeout e HTTP em ApiError com mensagem amigável.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isCurrentSessionRejected(error)) {
      unauthorizedHandler?.()
    }
    return Promise.reject(toApiError(error))
  },
)
