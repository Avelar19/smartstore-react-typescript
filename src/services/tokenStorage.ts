// Apenas o accessToken é persistido, no sessionStorage (descartado ao fechar a aba).
// O refreshToken não é armazenado e senhas nunca são gravadas no navegador.
export const ACCESS_TOKEN_STORAGE_KEY = 'smartstore.accessToken'

// O acesso ao storage pode falhar (ex.: modo privado restrito); nesse caso a sessão não é persistida.
export function getAccessToken(): string | null {
  try {
    return window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string): void {
  try {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
  } catch {
    // Sem persistência: a sessão dura até o recarregamento da página.
  }
}

export function clearAccessToken(): void {
  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    // Nada a remover.
  }
}
