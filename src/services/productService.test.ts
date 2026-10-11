import { afterEach, describe, expect, it } from 'vitest'

import { createProductPage, getProductFixture, productFixtures } from '../tests/fixtures/products.ts'
import { jsonResponse, mockApiAdapter, restoreApiAdapter } from '../tests/axiosMock.ts'
import { ApiError } from './apiError.ts'
import {
  fetchCatalogPage,
  fetchCatalogStats,
  fetchCategories,
  fetchProductById,
  fetchProducts,
  fetchProductsByCategory,
  PRODUCT_SUMMARY_FIELDS,
  searchProducts,
} from './productService.ts'

const signal = new AbortController().signal
const emptyPage = { products: [], total: 0, skip: 0, limit: 0 }

afterEach(() => {
  restoreApiAdapter()
})

function lastRequest(adapter: ReturnType<typeof mockApiAdapter>) {
  const config = adapter.mock.lastCall?.[0]
  if (!config) throw new Error('Nenhuma requisição foi feita.')
  return { url: config.url, params: config.params as unknown, signal: config.signal }
}

describe('productService — endpoints', () => {
  it('GET /products com limit, skip, ordenação e campos selecionados', async () => {
    const page = createProductPage(productFixtures, { limit: 8, skip: 8 })
    const adapter = mockApiAdapter((config) => jsonResponse(config, page))

    const result = await fetchProducts({ limit: 8, skip: 8, sortBy: 'rating', order: 'desc' }, signal)

    expect(lastRequest(adapter)).toEqual({
      url: '/products',
      params: { limit: 8, skip: 8, sortBy: 'rating', order: 'desc', select: PRODUCT_SUMMARY_FIELDS },
      signal,
    })
    expect(result.total).toBe(12)
    expect(result.products).toHaveLength(4)
  })

  it('GET /products/search com o termo pesquisado', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, emptyPage))

    await searchProducts('phone', { limit: 8, skip: 0 }, signal)

    expect(lastRequest(adapter)).toMatchObject({
      url: '/products/search',
      params: { q: 'phone', limit: 8, skip: 0, select: PRODUCT_SUMMARY_FIELDS },
    })
  })

  it('GET /products/category/:slug com o slug original', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, emptyPage))

    await fetchProductsByCategory('home-decoration', { limit: 8, skip: 16 }, signal)

    expect(lastRequest(adapter)).toMatchObject({
      url: '/products/category/home-decoration',
      params: { limit: 8, skip: 16 },
    })
  })

  it('GET /products/categories', async () => {
    const adapter = mockApiAdapter((config) =>
      jsonResponse(config, [{ slug: 'laptops', name: 'Laptops', url: 'https://dummyjson.com/x' }]),
    )

    const categories = await fetchCategories(signal)

    expect(lastRequest(adapter).url).toBe('/products/categories')
    expect(categories).toEqual([{ slug: 'laptops', name: 'Laptops' }])
  })

  it('GET /products/:id', async () => {
    const product = getProductFixture(4)
    const adapter = mockApiAdapter((config) => jsonResponse(config, product))

    const result = await fetchProductById(4, signal)

    expect(lastRequest(adapter).url).toBe('/products/4')
    expect(result.title).toBe('MacBook Pro 14')
  })
})

describe('productService — estatísticas', () => {
  it('GET /products?limit=0 com campos mínimos para o dashboard', async () => {
    const adapter = mockApiAdapter((config) =>
      jsonResponse(config, { products: [{ id: 1, price: 9.99, stock: 99, rating: 2.56, category: 'beauty' }], total: 1 }),
    )

    const stats = await fetchCatalogStats(signal)

    expect(lastRequest(adapter)).toMatchObject({
      url: '/products',
      params: { limit: 0, select: 'price,stock,rating,category' },
    })
    expect(stats.total).toBe(1)
  })
})

describe('productService — validação Zod', () => {
  it('rejeita com ApiError "validation" quando a resposta tem formato inesperado', async () => {
    mockApiAdapter((config) => jsonResponse(config, { products: [{ id: 'x' }], total: 1 }))

    await expect(fetchProducts({ limit: 8, skip: 0 }, signal)).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'validation',
    })
  })

  it('rejeita produto inválido no endpoint de detalhes', async () => {
    mockApiAdapter((config) => jsonResponse(config, '<html>erro</html>'))

    const promise = fetchProductById(1, signal)

    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({ kind: 'validation' })
  })
})

describe('fetchCatalogPage — escolha do endpoint', () => {
  it.each([
    [{ search: '', category: null }, '/products'],
    [{ search: '  ', category: null }, '/products'],
    [{ search: '', category: 'laptops' }, '/products/category/laptops'],
    [{ search: 'apple', category: null }, '/products/search'],
  ])('filtros %o usam %s', async (filters, expectedUrl) => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, emptyPage))

    await fetchCatalogPage({ ...filters, limit: 8, skip: 0 }, signal)

    expect(lastRequest(adapter).url).toBe(expectedUrl)
  })

  it('envia o termo sem espaços extras', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, emptyPage))

    await fetchCatalogPage({ search: '  phone ', category: null, limit: 8, skip: 0 }, signal)

    expect(lastRequest(adapter).params).toMatchObject({ q: 'phone' })
  })
})
