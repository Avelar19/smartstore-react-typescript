import { notifications } from '@mantine/notifications'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { AuthUser, LoginFormValues } from '../schemas/auth.ts'
import { setUnauthorizedHandler } from '../services/api.ts'
import { toApiError } from '../services/apiError.ts'
import { getLoginErrorMessage, SESSION_EXPIRED_MESSAGE } from '../services/authErrors.ts'
import { fetchCurrentUser, login as loginRequest } from '../services/authService.ts'
import { clearAccessToken, getAccessToken, setAccessToken } from '../services/tokenStorage.ts'
import { getTokenExpiration, isTokenExpired } from '../utils/jwt.ts'
import { AuthContext } from './authContext.ts'
import type { AuthContextValue, AuthStatus } from './authContext.ts'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  /** Expiração do token em ms, usada para encerrar a sessão automaticamente. */
  expiresAt: number | null
  error: string | null
}

interface InitialSession {
  state: AuthState
  /** Token salvo que ainda precisa ser validado em GET /auth/me. */
  tokenToRestore: string | null
  /** Havia token salvo, mas a claim `exp` indica que já expirou. */
  hadExpiredToken: boolean
}

type SessionEndReason = 'logout' | 'expired'

const UNAUTHENTICATED_STATE: AuthState = { status: 'unauthenticated', user: null, expiresAt: null, error: null }

// setTimeout aceita no máximo ~24,8 dias; tokens com expiração maior não agendam encerramento.
const MAX_TIMEOUT_MS = 2_147_483_647

/** Lê o sessionStorage uma única vez, antes da primeira renderização (sem "piscar" a área restrita). */
function getInitialSession(): InitialSession {
  const token = getAccessToken()

  if (token === null) {
    return { state: UNAUTHENTICATED_STATE, tokenToRestore: null, hadExpiredToken: false }
  }
  if (isTokenExpired(token)) {
    return { state: UNAUTHENTICATED_STATE, tokenToRestore: null, hadExpiredToken: true }
  }
  return {
    state: { status: 'restoring', user: null, expiresAt: null, error: null },
    tokenToRestore: token,
    hadExpiredToken: false,
  }
}

function notifySessionExpired(): void {
  // O id fixo impede notificações duplicadas quando várias requisições falham juntas.
  notifications.show({
    id: 'session-expired',
    color: 'orange',
    title: 'Sessão encerrada',
    message: SESSION_EXPIRED_MESSAGE,
  })
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [initialSession] = useState(getInitialSession)
  const [state, setState] = useState<AuthState>(initialSession.state)

  // Cada operação (restauração, login, logout, expiração) cria uma nova "versão" da sessão.
  // Respostas que chegam depois de uma operação mais recente são descartadas.
  const sessionVersionRef = useRef(0)

  const endSession = useCallback((reason: SessionEndReason) => {
    sessionVersionRef.current += 1
    clearAccessToken()
    setState(UNAUTHENTICATED_STATE)
    if (reason === 'expired') notifySessionExpired()
  }, [])

  // Restauração da sessão: valida o token salvo antes de liberar a área administrativa.
  useEffect(() => {
    const { tokenToRestore, hadExpiredToken } = initialSession

    if (hadExpiredToken) {
      clearAccessToken()
      notifySessionExpired()
      return
    }
    if (tokenToRestore === null) return

    const version = sessionVersionRef.current
    const controller = new AbortController()
    const isStale = () => controller.signal.aborted || version !== sessionVersionRef.current

    fetchCurrentUser(tokenToRestore, controller.signal).then(
      (user) => {
        if (isStale()) return
        setState({ status: 'authenticated', user, expiresAt: getTokenExpiration(tokenToRestore), error: null })
      },
      (error: unknown) => {
        if (isStale() || toApiError(error).kind === 'canceled') return
        // Token recusado (401 expirado, 500 "invalid token"), resposta inválida ou falha de rede:
        // sem confirmação do servidor, a sessão não é restaurada.
        endSession('expired')
      },
    )

    return () => {
      controller.abort()
    }
  }, [initialSession, endSession])

  // HTTP 401 em requisições autenticadas com o token atual encerra a sessão (ver api.ts).
  useEffect(() => {
    setUnauthorizedHandler(() => endSession('expired'))
    return () => {
      setUnauthorizedHandler(null)
    }
  }, [endSession])

  // Encerra a sessão automaticamente quando o token expira.
  const { status, expiresAt } = state
  useEffect(() => {
    if (status !== 'authenticated' || expiresAt === null) return

    const delay = Math.max(0, expiresAt - Date.now())
    if (delay > MAX_TIMEOUT_MS) return

    const timeoutId = window.setTimeout(() => endSession('expired'), delay)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [status, expiresAt, endSession])

  const login = useCallback(async (credentials: LoginFormValues) => {
    sessionVersionRef.current += 1
    const version = sessionVersionRef.current
    setState((current) => (current.error === null ? current : { ...current, error: null }))

    try {
      const { accessToken, user } = await loginRequest(credentials)
      if (version !== sessionVersionRef.current) return false

      setAccessToken(accessToken)
      setState({ status: 'authenticated', user, expiresAt: getTokenExpiration(accessToken), error: null })
      return true
    } catch (error) {
      if (version !== sessionVersionRef.current) return false

      const message = getLoginErrorMessage(toApiError(error))
      setState((current) => ({ ...current, error: message }))
      return false
    }
  }, [])

  const logout = useCallback(() => endSession('logout'), [endSession])

  const clearError = useCallback(() => {
    setState((current) => (current.error === null ? current : { ...current, error: null }))
  }, [])

  // Valor memorizado: consumidores só renderizam de novo quando a sessão realmente muda.
  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      status: state.status,
      isAuthenticated: state.status === 'authenticated',
      isRestoring: state.status === 'restoring',
      error: state.error,
      login,
      logout,
      clearError,
    }),
    [state.user, state.status, state.error, login, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
