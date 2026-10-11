import { describe, expect, it } from 'vitest'

import { DEFAULT_AUTHENTICATED_PATH, getRedirectPath, hasRedirectState } from './redirect.ts'

describe('getRedirectPath', () => {
  it('retorna a rota original com query e hash', () => {
    const state = { from: { pathname: '/admin', search: '?aba=resumo', hash: '#topo' } }

    expect(getRedirectPath(state)).toBe('/admin?aba=resumo#topo')
    expect(hasRedirectState(state)).toBe(true)
  })

  it.each([undefined, null, 'texto', { from: '/admin' }, { from: { pathname: 42 } }])(
    'usa o painel como padrão para estado inválido: %o',
    (state) => {
      expect(getRedirectPath(state)).toBe(DEFAULT_AUTHENTICATED_PATH)
    },
  )

  it.each(['//site-externo.com', 'https://site-externo.com', '/login'])(
    'não redireciona para destinos externos ou para o próprio login: %s',
    (pathname) => {
      expect(getRedirectPath({ from: { pathname } })).toBe(DEFAULT_AUTHENTICATED_PATH)
    },
  )
})
