import { describe, expect, it } from 'vitest'

import { categoryListSchema, productPageSchema, productSchema } from './product.ts'

// Trecho real de GET /products/1 (com campos extras que não são usados pela aplicação).
const apiProduct = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'The Essence Mascara Lash Princess is a popular mascara.',
  category: 'beauty',
  price: 9.99,
  discountPercentage: 10.48,
  rating: 2.56,
  stock: 99,
  tags: ['beauty', 'mascara'],
  brand: 'Essence',
  sku: 'BEA-ESS-ESS-001',
  warrantyInformation: '1 week warranty',
  shippingInformation: 'Ships in 3-5 business days',
  returnPolicy: 'No return policy',
  reviews: [{ rating: 3, comment: 'Would not recommend!' }],
  images: ['https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp'],
  thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
}

describe('schemas de produto', () => {
  it('aceita a resposta real da API e descarta campos não utilizados', () => {
    const result = productSchema.safeParse(apiProduct)

    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty('sku')
    expect(result.data).not.toHaveProperty('reviews')
  })

  it('aceita produtos sem marca (campo ausente em parte da API)', () => {
    const withoutBrand = Object.fromEntries(Object.entries(apiProduct).filter(([key]) => key !== 'brand'))

    expect(productSchema.safeParse(withoutBrand).success).toBe(true)
  })

  it('rejeita produtos com tipos incorretos', () => {
    expect(productSchema.safeParse({ ...apiProduct, price: '9.99' }).success).toBe(false)
    expect(productSchema.safeParse({ ...apiProduct, rating: 7 }).success).toBe(false)
    expect(productSchema.safeParse({ ...apiProduct, id: undefined }).success).toBe(false)
  })

  it('valida respostas paginadas, inclusive vazias', () => {
    expect(productPageSchema.safeParse({ products: [], total: 0, skip: 0, limit: 0 }).success).toBe(true)
    expect(productPageSchema.safeParse({ products: [apiProduct], total: 194, skip: 0, limit: 8 }).success).toBe(
      true,
    )
    expect(productPageSchema.safeParse({ products: [apiProduct], skip: 0, limit: 8 }).success).toBe(false)
  })

  it('valida a lista de categorias', () => {
    const categories = [{ slug: 'beauty', name: 'Beauty', url: 'https://dummyjson.com/products/category/beauty' }]

    expect(categoryListSchema.safeParse(categories).success).toBe(true)
    expect(categoryListSchema.safeParse(['beauty']).success).toBe(false)
  })
})
