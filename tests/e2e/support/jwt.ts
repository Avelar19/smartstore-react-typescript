// JWT de teste: payload legível com `exp`, assinatura falsa. Não há segredo envolvido.

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

export function createTestJwt(expiresInSeconds: number, username = 'usuario.e2e'): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const payload = base64Url(JSON.stringify({ id: 1, username, exp }))
  return `${header}.${payload}.assinatura-falsa-e2e`
}
