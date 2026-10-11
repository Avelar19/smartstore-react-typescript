import { describe, expect, it } from 'vitest'

import { parseCatalogParams } from './catalogParams.ts'

describe('parseCatalogParams', () => {
  it('usa valores padrão quando a URL não tem filtros', () => {
    expect(parseCatalogParams(new URLSearchParams())).toEqual({ search: '', category: null, page: 1 })
  })

  it('lê busca, categoria e página da URL', () => {
    expect(parseCatalogParams(new URLSearchParams('q=phone&category=laptops&page=3'))).toEqual({
      search: 'phone',
      category: 'laptops',
      page: 3,
    })
  })

  it.each(['0', '-2', '1.5', 'abc'])('ignora página inválida "%s"', (page) => {
    expect(parseCatalogParams(new URLSearchParams({ page })).page).toBe(1)
  })
})
