import { describe, expect, it } from 'vitest'

import { initialProductChangesState } from '../contexts/productChangesReducer.ts'
import { getProductFixture, toSummary } from '../tests/fixtures/products.ts'
import { applyChangesToPage, toLocalRows } from './adminProducts.ts'

const page = [toSummary(getProductFixture(1)), toSummary(getProductFixture(2)), toSummary(getProductFixture(3))]

describe('applyChangesToPage', () => {
  it('sem alterações, devolve os produtos originais', () => {
    const rows = applyChangesToPage(page, initialProductChangesState)

    expect(rows.map((row) => [row.key, row.title, row.status])).toEqual([
      ['api-1', 'iPhone 13 Pro', 'original'],
      ['api-2', 'Samsung Galaxy S21', 'original'],
      ['api-3', 'Oppo A57', 'original'],
    ])
  })

  it('aplica edições e remove excluídos sobre dados recém-buscados da API', () => {
    const changes = {
      ...initialProductChangesState,
      updatedProducts: { 2: { title: 'Galaxy editado', description: 'x', category: 'laptops', price: 1, stock: 9 } },
      deletedProductIds: [3],
    }

    // Mesmo que a API devolva os dados originais (refetch), a sessão prevalece.
    const rows = applyChangesToPage(page, changes)

    expect(rows.map((row) => row.key)).toEqual(['api-1', 'api-2'])
    expect(rows[1]).toMatchObject({ title: 'Galaxy editado', category: 'laptops', price: 1, stock: 9, status: 'edited' })
  })
})

describe('toLocalRows', () => {
  it('converte produtos locais em linhas com chave própria', () => {
    const rows = toLocalRows([
      { localId: 4, apiId: 195, title: 'Novo', description: 'x', category: 'beauty', price: 5, stock: 1 },
    ])

    expect(rows).toEqual([
      {
        ref: { kind: 'local', localId: 4 },
        key: 'local-4',
        title: 'Novo',
        category: 'beauty',
        price: 5,
        stock: 1,
        thumbnail: '',
        status: 'created',
      },
    ])
  })
})
