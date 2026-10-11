import { jwtPayloadSchema } from '../schemas/auth.ts'

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}

/**
 * Lê a expiração (claim `exp`) do JWT, em milissegundos.
 * Apenas decodifica o payload — a assinatura só pode ser verificada pelo servidor.
 */
export function getTokenExpiration(token: string): number | null {
  const payloadSegment = token.split('.')[1]
  if (!payloadSegment) return null

  try {
    const payload: unknown = JSON.parse(decodeBase64Url(payloadSegment))
    const result = jwtPayloadSchema.safeParse(payload)
    return result.success ? result.data.exp * 1000 : null
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiration = getTokenExpiration(token)
  return expiration !== null && expiration <= now
}
