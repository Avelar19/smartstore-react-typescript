import { z } from 'zod'

export const DEFAULT_AUTHENTICATED_PATH = '/admin'

/** Estado de navegação enviado pelo ProtectedRoute: `{ from: location }`. */
const redirectStateSchema = z.object({
  from: z.object({
    pathname: z.string(),
    search: z.string().optional(),
    hash: z.string().optional(),
  }),
})

/** Indica se o usuário chegou ao login vindo de uma rota protegida. */
export function hasRedirectState(state: unknown): boolean {
  return redirectStateSchema.safeParse(state).success
}

/**
 * Rota para onde o usuário volta após o login. `location.state` não é tipado (unknown),
 * por isso é validado; apenas caminhos internos são aceitos (evita redirecionamento aberto).
 */
export function getRedirectPath(state: unknown): string {
  const result = redirectStateSchema.safeParse(state)
  if (!result.success) return DEFAULT_AUTHENTICATED_PATH

  const { pathname, search = '', hash = '' } = result.data.from
  const isInternalPath = pathname.startsWith('/') && !pathname.startsWith('//')
  if (!isInternalPath || pathname === '/login') return DEFAULT_AUTHENTICATED_PATH

  return `${pathname}${search}${hash}`
}
