import { catalogStatsResponseSchema, categoryListSchema, productPageSchema, productSchema } from '../schemas/product.ts'
import type { CatalogStatsResponse, Category, Product, ProductPage } from '../schemas/product.ts'
import { api } from './api.ts'
import { parseApiResponse } from './validation.ts'

/** Campos pedidos nas listagens (o `id` sempre é retornado pela API). */
export const PRODUCT_SUMMARY_FIELDS =
  'title,category,price,discountPercentage,rating,stock,brand,thumbnail'

export interface PaginationParams {
  limit: number
  skip: number
}

export interface ProductListParams extends PaginationParams {
  sortBy?: 'rating' | 'price' | 'title'
  order?: 'asc' | 'desc'
}

/**
 * Filtros do catálogo. A DummyJSON não combina busca e categoria
 * (/products/search ignora `category` e /products/category/:slug ignora `q`),
 * por isso o catálogo trata os dois filtros como mutuamente exclusivos.
 */
export interface CatalogQuery extends PaginationParams {
  search: string
  category: string | null
}

export async function fetchProducts(params: ProductListParams, signal: AbortSignal): Promise<ProductPage> {
  const response = await api.get<unknown>('/products', {
    params: { ...params, select: PRODUCT_SUMMARY_FIELDS },
    signal,
  })
  return parseApiResponse(productPageSchema, response.data)
}

export async function searchProducts(
  query: string,
  params: PaginationParams,
  signal: AbortSignal,
): Promise<ProductPage> {
  const response = await api.get<unknown>('/products/search', {
    params: { q: query, ...params, select: PRODUCT_SUMMARY_FIELDS },
    signal,
  })
  return parseApiResponse(productPageSchema, response.data)
}

export async function fetchProductsByCategory(
  slug: string,
  params: PaginationParams,
  signal: AbortSignal,
): Promise<ProductPage> {
  const response = await api.get<unknown>(`/products/category/${encodeURIComponent(slug)}`, {
    params: { ...params, select: PRODUCT_SUMMARY_FIELDS },
    signal,
  })
  return parseApiResponse(productPageSchema, response.data)
}

export async function fetchCategories(signal: AbortSignal): Promise<Category[]> {
  const response = await api.get<unknown>('/products/categories', { signal })
  return parseApiResponse(categoryListSchema, response.data)
}

export async function fetchProductById(id: number, signal: AbortSignal): Promise<Product> {
  const response = await api.get<unknown>(`/products/${id}`, { signal })
  return parseApiResponse(productSchema, response.data)
}

/**
 * GET /products?limit=0 — todos os produtos (apenas os campos das métricas), para que o
 * dashboard calcule indicadores sobre o catálogo completo, e não sobre uma página parcial.
 */
export async function fetchCatalogStats(signal: AbortSignal): Promise<CatalogStatsResponse> {
  const response = await api.get<unknown>('/products', {
    params: { limit: 0, select: 'price,stock,rating,category' },
    signal,
  })
  return parseApiResponse(catalogStatsResponseSchema, response.data)
}

/** Escolhe o endpoint adequado conforme o filtro ativo do catálogo. */
export function fetchCatalogPage(query: CatalogQuery, signal: AbortSignal): Promise<ProductPage> {
  const { search, category, limit, skip } = query
  const trimmedSearch = search.trim()

  if (trimmedSearch) return searchProducts(trimmedSearch, { limit, skip }, signal)
  if (category) return fetchProductsByCategory(category, { limit, skip }, signal)
  return fetchProducts({ limit, skip }, signal)
}
