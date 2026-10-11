/**
 * Converte a base do Vite (import.meta.env.BASE_URL) no basename do React Router.
 *
 * O Vite fornece a base com barra final ("/smartstore-react-typescript/"), mas o
 * React Router não reconhece "/smartstore-react-typescript" (sem barra) quando o
 * basename termina com "/". Por isso a barra final é removida.
 */
export function getRouterBasename(baseUrl: string): string {
  const withoutTrailingSlash = baseUrl.replace(/\/+$/, '')
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash
}
