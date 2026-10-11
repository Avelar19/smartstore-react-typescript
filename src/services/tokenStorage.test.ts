import { afterEach, describe, expect, it, vi } from 'vitest'

import { ACCESS_TOKEN_STORAGE_KEY, clearAccessToken, getAccessToken, setAccessToken } from './tokenStorage.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('tokenStorage', () => {
  it('grava, lê e remove o token no sessionStorage', () => {
    setAccessToken('abc')
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('abc')
    expect(getAccessToken()).toBe('abc')

    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })

  it('não quebra a aplicação quando o storage está indisponível (ex.: modo privado restrito)', () => {
    const blocked = () => {
      throw new DOMException('Acesso negado', 'SecurityError')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked)

    expect(getAccessToken()).toBeNull()
    expect(() => setAccessToken('abc')).not.toThrow()
    expect(() => clearAccessToken()).not.toThrow()
  })
})
