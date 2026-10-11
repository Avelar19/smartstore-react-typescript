import { afterEach, describe, expect, it } from 'vitest'

import type { ProductInput } from '../schemas/adminProduct.ts'
import { httpError, jsonResponse, mockApiAdapter, restoreApiAdapter } from '../tests/axiosMock.ts'
import { createTestToken, storeSessionToken } from '../tests/fixtures/auth.ts'
import { createProduct, deleteProduct, updateProduct } from './adminProductService.ts'

const input: ProductInput = { title: 'Notebook', description: 'Desc', category: 'laptops', price: 1299.9, stock: 3 }

afterEach(() => {
  restoreApiAdapter()
})

function lastRequest(adapter: ReturnType<typeof mockApiAdapter>) {
  const config = adapter.mock.lastCall?.[0]
  if (!config) throw new Error('Nenhuma requisição foi feita.')
  return { method: config.method, url: config.url, body: JSON.parse(String(config.data ?? 'null')) as unknown, config }
}

describe('adminProductService', () => {
  it('POST /products/add envia preço e estoque como números e usa a confirmação da API', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, { id: 195, ...input, title: 'Notebook (API)' }, 201))

    const result = await createProduct(input)

    const request = lastRequest(adapter)
    expect(request.method).toBe('post')
    expect(request.url).toBe('/products/add')
    expect(request.body).toEqual({ title: 'Notebook', description: 'Desc', category: 'laptops', price: 1299.9, stock: 3 })
    expect(result).toEqual({ id: 195, product: { ...input, title: 'Notebook (API)' } })
  })

  it('aceita resposta de criação que não ecoa todos os campos', async () => {
    mockApiAdapter((config) => jsonResponse(config, { id: 195 }, 201))

    await expect(createProduct(input)).resolves.toEqual({ id: 195, product: input })
  })

  it('envia o JWT da sessão nas operações de escrita', async () => {
    const token = createTestToken()
    storeSessionToken(token)
    const adapter = mockApiAdapter((config) => jsonResponse(config, { id: 195 }, 201))

    await createProduct(input)

    expect(lastRequest(adapter).config.headers.get('Authorization')).toBe(`Bearer ${token}`)
  })

  it('PUT /products/:id', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, { id: 4, ...input, rating: 4.8 }))

    const result = await updateProduct(4, input)

    expect(lastRequest(adapter)).toMatchObject({ method: 'put', url: '/products/4', body: input })
    expect(result.product).toEqual(input)
  })

  it('rejeita confirmação de edição de outro produto', async () => {
    mockApiAdapter((config) => jsonResponse(config, { id: 5 }))

    await expect(updateProduct(4, input)).rejects.toMatchObject({ kind: 'validation' })
  })

  it('DELETE /products/:id exige isDeleted', async () => {
    const adapter = mockApiAdapter((config) =>
      jsonResponse(config, { id: 4, title: 'X', isDeleted: true, deletedOn: '2026-10-11T18:00:00.000Z' }),
    )

    await deleteProduct(4)

    expect(lastRequest(adapter)).toMatchObject({ method: 'delete', url: '/products/4' })
  })

  it('rejeita resposta de exclusão sem confirmação (validação Zod)', async () => {
    mockApiAdapter((config) => jsonResponse(config, { id: 4, title: 'X' }))

    await expect(deleteProduct(4)).rejects.toMatchObject({ kind: 'validation' })
  })

  it('rejeita confirmação de exclusão de outro produto', async () => {
    mockApiAdapter((config) => jsonResponse(config, { id: 5, isDeleted: true, deletedOn: '2026-10-11T18:00:00.000Z' }))

    await expect(deleteProduct(4)).rejects.toMatchObject({ kind: 'validation' })
  })

  it('propaga 404 da API normalizado', async () => {
    mockApiAdapter((config) => {
      throw httpError(config, 404, { message: "Product with id '195' not found" })
    })

    await expect(updateProduct(195, input)).rejects.toMatchObject({ kind: 'http', status: 404 })
  })
})
