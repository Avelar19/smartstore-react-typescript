// Tipos de domínio inferidos dos schemas Zod (fonte única de verdade).
export type { Category, Product, ProductPage, ProductSummary } from '../schemas/product.ts'

export interface CategoryOption {
  value: string
  label: string
}
