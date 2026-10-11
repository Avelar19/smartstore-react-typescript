import type { ProductChangesState } from '../contexts/productChangesReducer.ts'
import type { ProductSummary } from '../types/product.ts'
import type { AdminProductRow, LocalProduct } from '../types/admin.ts'
import { refKey } from './productRef.ts'

/** Aplica as alterações da sessão sobre uma página da API: remove excluídos e mescla edições. */
export function applyChangesToPage(
  products: readonly ProductSummary[],
  changes: ProductChangesState,
): AdminProductRow[] {
  return products
    .filter((product) => !changes.deletedProductIds.includes(product.id))
    .map((product) => {
      const update = changes.updatedProducts[product.id]
      const ref = { kind: 'api', id: product.id } as const
      return {
        ref,
        key: refKey(ref),
        title: update?.title ?? product.title,
        category: update?.category ?? product.category,
        price: update?.price ?? product.price,
        stock: update?.stock ?? product.stock,
        thumbnail: product.thumbnail,
        status: update ? 'edited' : 'original',
      }
    })
}

export function toLocalRows(products: readonly LocalProduct[]): AdminProductRow[] {
  return products.map((product) => {
    const ref = { kind: 'local', localId: product.localId } as const
    return {
      ref,
      key: refKey(ref),
      title: product.title,
      category: product.category,
      price: product.price,
      stock: product.stock,
      thumbnail: '',
      status: 'created',
    }
  })
}
