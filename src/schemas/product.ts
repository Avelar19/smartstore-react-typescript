import { z } from 'zod'

/**
 * Campos usados nas listagens (cards). As requisições de listagem pedem apenas
 * esses campos via `select`, reduzindo o tamanho das respostas.
 * Na API real, `brand` não existe em parte dos produtos (ex.: mercado).
 */
export const productSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  discountPercentage: z.number().nonnegative(),
  rating: z.number().min(0).max(5),
  stock: z.number().int().nonnegative(),
  brand: z.string().optional(),
  thumbnail: z.string(),
})

/** Produto completo (GET /products/:id). Campos informativos são opcionais. */
export const productSchema = productSummarySchema.extend({
  description: z.string(),
  images: z.array(z.string()),
  tags: z.array(z.string()),
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  returnPolicy: z.string().optional(),
})

/** Formato paginado comum a /products, /products/search e /products/category/:slug. */
export const productPageSchema = z.object({
  products: z.array(productSummarySchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
})

/** GET /products?limit=0&select=price,stock,rating,category — catálogo completo para o dashboard. */
export const catalogStatsResponseSchema = z.object({
  products: z.array(
    z.object({
      id: z.number().int().positive(),
      price: z.number().nonnegative(),
      stock: z.number().int().nonnegative(),
      rating: z.number().min(0).max(5),
      category: z.string().min(1),
    }),
  ),
  total: z.number().int().nonnegative(),
})

export const categorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
})

export const categoryListSchema = z.array(categorySchema)

export type ProductSummary = z.infer<typeof productSummarySchema>
export type Product = z.infer<typeof productSchema>
export type ProductPage = z.infer<typeof productPageSchema>
export type Category = z.infer<typeof categorySchema>
export type CatalogStatsResponse = z.infer<typeof catalogStatsResponseSchema>
