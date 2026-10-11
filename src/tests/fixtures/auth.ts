import type { AuthUser } from '../../schemas/auth.ts'
import { ACCESS_TOKEN_STORAGE_KEY } from '../../services/tokenStorage.ts'

// Credenciais públicas de demonstração da DummyJSON (não são segredo).
export const DEMO_USERNAME = 'emilys'
export const DEMO_PASSWORD = 'emilyspass'

export const authUserFixture: AuthUser = {
  id: 1,
  username: 'emilys',
  email: 'emily.johnson@x.dummyjson.com',
  firstName: 'Emily',
  lastName: 'Johnson',
  image: 'https://dummyjson.com/icon/emilys/128',
  role: 'admin',
}

function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Gera um JWT de teste (assinatura falsa) com expiração relativa ao momento atual. */
export function createTestToken(expiresInSeconds = 3600, subject = 'emilys'): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const payload = toBase64Url(JSON.stringify({ id: 1, username: subject, exp }))
  return `${header}.${payload}.assinatura-de-teste`
}

export function storeSessionToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}
