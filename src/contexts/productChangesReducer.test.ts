import { describe, expect, it } from 'vitest'

import type { ProductInput } from '../schemas/adminProduct.ts'
import { initialProductChangesState, productChangesReducer } from './productChangesReducer.ts'
import type { ProductChangesState } from './productChangesReducer.ts'

const input: ProductInput = { title: 'Novo', description: 'Desc', category: 'laptops', price: 10, stock: 2 }

function create(state: ProductChangesState, title: string): ProductChangesState {
  // A DummyJSON devolve sempre o id 195 para novos produtos.
  return productChangesReducer(state, { type: 'created', generation: 0, apiId: 195, product: { ...input, title } })
}

describe('productChangesReducer', () => {
  it('atribui ids locais únicos mesmo quando a API repete o id', () => {
    const state = create(create(initialProductChangesState, 'Primeiro'), 'Segundo')

    expect(state.createdProducts.map((product) => [product.localId, product.apiId, product.title])).toEqual([
      [2, 195, 'Segundo'],
      [1, 195, 'Primeiro'],
    ])
    expect(state.nextLocalId).toBe(3)
  })

  it('atualiza apenas o produto local indicado', () => {
    const state = create(create(initialProductChangesState, 'Primeiro'), 'Segundo')

    const next = productChangesReducer(state, {
      type: 'updated',
      generation: 0,
      ref: { kind: 'local', localId: 1 },
      product: { ...input, title: 'Primeiro editado' },
    })

    expect(next.createdProducts.map((product) => product.title)).toEqual(['Segundo', 'Primeiro editado'])
  })

  it('registra edição e exclusão de produtos da API', () => {
    const edited = productChangesReducer(initialProductChangesState, {
      type: 'updated',
      generation: 0,
      ref: { kind: 'api', id: 7 },
      product: input,
    })
    expect(edited.updatedProducts[7]).toEqual(input)

    const deleted = productChangesReducer(edited, { type: 'deleted', generation: 0, ref: { kind: 'api', id: 7 } })
    expect(deleted.deletedProductIds).toEqual([7])
    expect(deleted.updatedProducts[7]).toBeUndefined()

    // Excluir de novo não duplica o id.
    expect(productChangesReducer(deleted, { type: 'deleted', generation: 0, ref: { kind: 'api', id: 7 } })).toBe(deleted)
  })

  it('remove produtos locais excluídos', () => {
    const state = create(initialProductChangesState, 'Local')

    const next = productChangesReducer(state, { type: 'deleted', generation: 0, ref: { kind: 'local', localId: 1 } })

    expect(next.createdProducts).toEqual([])
    expect(next.deletedProductIds).toEqual([])
  })

  it('não altera o estado anterior (atualizações imutáveis)', () => {
    const before = create(initialProductChangesState, 'Original')
    const snapshot = structuredClone(before)

    productChangesReducer(before, { type: 'updated', generation: 0, ref: { kind: 'local', localId: 1 }, product: input })
    productChangesReducer(before, { type: 'deleted', generation: 0, ref: { kind: 'api', id: 3 } })
    productChangesReducer(before, { type: 'updated', generation: 0, ref: { kind: 'api', id: 3 }, product: input })

    expect(before).toEqual(snapshot)
  })

  it('reset descarta as alterações e inicia uma nova geração', () => {
    const state = create(initialProductChangesState, 'Local')

    const next = productChangesReducer(state, { type: 'reset' })

    expect(next).toEqual({ ...initialProductChangesState, generation: 1 })
  })

  it('ignora operações iniciadas em uma geração (sessão) anterior', () => {
    const newSession = productChangesReducer(create(initialProductChangesState, 'Antigo'), { type: 'reset' })

    const afterStaleCreate = productChangesReducer(newSession, {
      type: 'created',
      generation: 0,
      apiId: 195,
      product: input,
    })
    const afterStaleDelete = productChangesReducer(newSession, {
      type: 'deleted',
      generation: 0,
      ref: { kind: 'api', id: 1 },
    })

    expect(afterStaleCreate).toBe(newSession)
    expect(afterStaleDelete).toBe(newSession)
  })
})
