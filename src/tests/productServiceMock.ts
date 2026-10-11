import { vi } from 'vitest'

import { ApiError } from '../services/apiError.ts'
import {
  fetchCatalogPage,
  fetchCatalogStats,
  fetchCategories,
  fetchProductById,
  fetchProducts,
} from '../services/productService.ts'
import { categoryFixtures, createProductPage, getProductFixture, productFixtures } from './fixtures/products.ts'

/**
 * Implementações determinísticas do productService baseadas nas fixtures.
 * O arquivo de teste deve chamar `vi.mock('<caminho>/services/productService.ts')`.
 */
export function setupProductServiceMock(): void {
  vi.mocked(fetchCatalogPage).mockImplementation(({ search, category, limit, skip }) => {
    const term = search.trim().toLowerCase()
    const filtered = productFixtures.filter((product) =>
      term ? product.title.toLowerCase().includes(term) : category === null || product.category === category,
    )
    return Promise.resolve(createProductPage(filtered, { limit, skip }))
  })

  vi.mocked(fetchCategories).mockResolvedValue(categoryFixtures)

  vi.mocked(fetchCatalogStats).mockResolvedValue({
    products: productFixtures.map(({ id, price, stock, rating, category }) => ({ id, price, stock, rating, category })),
    total: productFixtures.length,
  })

  vi.mocked(fetchProducts).mockImplementation(({ limit, skip, sortBy }) => {
    const ordered = sortBy === 'rating' ? [...productFixtures].sort((a, b) => b.rating - a.rating) : productFixtures
    return Promise.resolve(createProductPage(ordered, { limit, skip }))
  })

  vi.mocked(fetchProductById).mockImplementation((id) => {
    const exists = productFixtures.some((product) => product.id === id)
    return exists
      ? Promise.resolve(getProductFixture(id))
      : Promise.reject(new ApiError('http', 'O recurso solicitado não foi encontrado.', { status: 404 }))
  })
}
