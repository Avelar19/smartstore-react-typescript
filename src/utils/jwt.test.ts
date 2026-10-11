import { describe, expect, it } from 'vitest'

import { createTestToken } from '../tests/fixtures/auth.ts'
import { getTokenExpiration, isTokenExpired } from './jwt.ts'

describe('jwt', () => {
  it('lê a claim exp do payload em milissegundos', () => {
    const before = Date.now()
    const expiration = getTokenExpiration(createTestToken(60))

    expect(expiration).not.toBeNull()
    expect(expiration).toBeGreaterThan(before + 55_000)
    expect(expiration).toBeLessThanOrEqual(before + 61_000)
  })

  it('identifica tokens expirados e válidos', () => {
    expect(isTokenExpired(createTestToken(-10))).toBe(true)
    expect(isTokenExpired(createTestToken(60))).toBe(false)
  })

  it.each(['', 'abc', 'a.b.c', 'a.eyJmb28iOiJiYXIifQ.c'])('trata token malformado "%s" sem lançar erro', (token) => {
    expect(getTokenExpiration(token)).toBeNull()
    expect(isTokenExpired(token)).toBe(false)
  })
})
