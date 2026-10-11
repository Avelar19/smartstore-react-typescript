import { describe, expect, it } from 'vitest'

import { computeCatalogStats } from './catalogStats.ts'

describe('computeCatalogStats', () => {
  it('calcula os indicadores sobre os produtos recebidos', () => {
    const stats = computeCatalogStats({
      total: 3,
      products: [
        { id: 1, price: 10, stock: 5, rating: 4, category: 'a' },
        { id: 2, price: 20, stock: 0, rating: 3, category: 'a' },
        { id: 3, price: 30, stock: 7, rating: 5, category: 'b' },
      ],
    })

    expect(stats).toEqual({
      totalProducts: 3,
      analyzedProducts: 3,
      totalStock: 12,
      outOfStock: 1,
      averagePrice: 20,
      averageRating: 4,
      categoriesInUse: 2,
    })
  })

  it('não divide por zero quando não há produtos', () => {
    expect(computeCatalogStats({ total: 0, products: [] })).toMatchObject({ averagePrice: 0, averageRating: 0 })
  })
})
