import type { ProductRef } from '../types/admin.ts'

const LOCAL_PREFIX = 'local-'

/** Representação do ProductRef na URL: "12" (API) ou "local-3" (criado nesta sessão). */
export function toRefParam(ref: ProductRef): string {
  return ref.kind === 'api' ? String(ref.id) : `${LOCAL_PREFIX}${ref.localId}`
}

export function parseRefParam(param: string | undefined): ProductRef | null {
  if (!param) return null

  const isLocal = param.startsWith(LOCAL_PREFIX)
  const value = Number(isLocal ? param.slice(LOCAL_PREFIX.length) : param)
  if (!Number.isInteger(value) || value <= 0) return null

  return isLocal ? { kind: 'local', localId: value } : { kind: 'api', id: value }
}

export function refKey(ref: ProductRef): string {
  return ref.kind === 'api' ? `api-${ref.id}` : `local-${ref.localId}`
}
