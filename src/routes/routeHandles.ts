/** Metadados (`handle`) usados nas definições de rota. */
export interface ProtectedRouteHandle {
  requiresAuth: true
}

export const protectedRouteHandle: ProtectedRouteHandle = { requiresAuth: true }

/** `handle` é `unknown` no React Router; esta verificação identifica rotas protegidas. */
export function isProtectedRouteHandle(handle: unknown): handle is ProtectedRouteHandle {
  return typeof handle === 'object' && handle !== null && 'requiresAuth' in handle && handle.requiresAuth === true
}
