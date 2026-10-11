import type { CatalogStatsResponse } from '../schemas/product.ts'

export interface CatalogStats {
  /** Total informado pela API. */
  totalProducts: number
  /** Quantidade de produtos efetivamente recebidos (base dos demais cálculos). */
  analyzedProducts: number
  totalStock: number
  outOfStock: number
  averagePrice: number
  averageRating: number
  categoriesInUse: number
}

/** Calcula os indicadores do dashboard a partir dos dados recebidos, sem extrapolar. */
export function computeCatalogStats({ products, total }: CatalogStatsResponse): CatalogStats {
  const count = products.length
  const sum = (selector: (product: CatalogStatsResponse['products'][number]) => number) =>
    products.reduce((accumulator, product) => accumulator + selector(product), 0)

  return {
    totalProducts: total,
    analyzedProducts: count,
    totalStock: sum((product) => product.stock),
    outOfStock: products.filter((product) => product.stock === 0).length,
    averagePrice: count > 0 ? sum((product) => product.price) / count : 0,
    averageRating: count > 0 ? sum((product) => product.rating) / count : 0,
    categoriesInUse: new Set(products.map((product) => product.category)).size,
  }
}
