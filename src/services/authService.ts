import { authUserSchema, loginResponseSchema } from '../schemas/auth.ts'
import type { AuthUser, LoginFormValues } from '../schemas/auth.ts'
import { api } from './api.ts'
import { parseApiResponse } from './validation.ts'

/** Duração solicitada para o accessToken (a DummyJSON usa 60 minutos por padrão). */
export const SESSION_DURATION_MINUTES = 60

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

/** POST /auth/login — autentica e devolve o accessToken e os dados públicos do usuário. */
export async function login(credentials: LoginFormValues): Promise<LoginResult> {
  const response = await api.post<unknown>('/auth/login', {
    username: credentials.username,
    password: credentials.password,
    expiresInMins: SESSION_DURATION_MINUTES,
  })
  const { accessToken, ...userData } = parseApiResponse(loginResponseSchema, response.data)

  // Mantém só os campos do usuário; o refreshToken é descartado (não há fluxo de renovação).
  return { accessToken, user: parseApiResponse(authUserSchema, userData) }
}

/**
 * GET /auth/me — valida um token específico. O token é enviado explicitamente e o 401 é
 * tratado por quem chama (restauração de sessão), sem acionar o handler global.
 */
export async function fetchCurrentUser(accessToken: string, signal: AbortSignal): Promise<AuthUser> {
  const response = await api.get<unknown>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
    skipUnauthorizedHandler: true,
    signal,
  })
  return parseApiResponse(authUserSchema, response.data)
}
