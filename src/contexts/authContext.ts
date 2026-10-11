import { createContext } from 'react'

import type { AuthUser, LoginFormValues } from '../schemas/auth.ts'

/**
 * - restoring: há token salvo e ele está sendo validado em GET /auth/me
 * - authenticated: sessão válida
 * - unauthenticated: sem sessão
 */
export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  isRestoring: boolean
  /** Mensagem da última tentativa de login malsucedida. */
  error: string | null
  /** Resolve `true` quando a sessão foi iniciada. Nunca rejeita: falhas ficam em `error`. */
  login: (credentials: LoginFormValues) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
