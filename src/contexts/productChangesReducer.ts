import type { ProductInput } from '../schemas/adminProduct.ts'
import type { LocalProduct, ProductRef } from '../types/admin.ts'

/**
 * Alterações simuladas do CRUD, mantidas em memória durante a sessão.
 * São aplicadas sobre os dados da API a cada renderização ("overlay"), de modo que um novo
 * GET não desfaz o que foi confirmado pela API.
 */
export interface ProductChangesState {
  /** Produtos cadastrados nesta sessão (mais recentes primeiro). */
  createdProducts: readonly LocalProduct[]
  /** Campos editados de produtos da API, por id. */
  updatedProducts: Readonly<Record<number, ProductInput>>
  /** Ids da API excluídos nesta sessão. */
  deletedProductIds: readonly number[]
  nextLocalId: number
  /**
   * Incrementada a cada troca de sessão (logout/login). Operações iniciadas em uma geração
   * anterior são ignoradas, para que respostas atrasadas não alterem a sessão seguinte.
   */
  generation: number
}

export type ProductChangesAction =
  | { type: 'created'; generation: number; apiId: number; product: ProductInput }
  | { type: 'updated'; generation: number; ref: ProductRef; product: ProductInput }
  | { type: 'deleted'; generation: number; ref: ProductRef }
  | { type: 'reset' }

export const initialProductChangesState: ProductChangesState = {
  createdProducts: [],
  updatedProducts: {},
  deletedProductIds: [],
  nextLocalId: 1,
  generation: 0,
}

/** Reducer puro: todas as atualizações criam novos arrays/objetos (imutabilidade). */
export function productChangesReducer(state: ProductChangesState, action: ProductChangesAction): ProductChangesState {
  if (action.type !== 'reset' && action.generation !== state.generation) return state

  switch (action.type) {
    case 'created': {
      const localProduct: LocalProduct = { ...action.product, localId: state.nextLocalId, apiId: action.apiId }
      return {
        ...state,
        createdProducts: [localProduct, ...state.createdProducts],
        nextLocalId: state.nextLocalId + 1,
      }
    }

    case 'updated': {
      const { ref, product } = action
      if (ref.kind === 'local') {
        return {
          ...state,
          createdProducts: state.createdProducts.map((item) =>
            item.localId === ref.localId ? { ...item, ...product } : item,
          ),
        }
      }
      return { ...state, updatedProducts: { ...state.updatedProducts, [ref.id]: product } }
    }

    case 'deleted': {
      const { ref } = action
      if (ref.kind === 'local') {
        return { ...state, createdProducts: state.createdProducts.filter((item) => item.localId !== ref.localId) }
      }
      if (state.deletedProductIds.includes(ref.id)) return state

      const remainingUpdates = Object.fromEntries(
        Object.entries(state.updatedProducts).filter(([id]) => Number(id) !== ref.id),
      )
      return {
        ...state,
        updatedProducts: remainingUpdates,
        deletedProductIds: [...state.deletedProductIds, ref.id],
      }
    }

    case 'reset':
      return { ...initialProductChangesState, generation: state.generation + 1 }
  }
}
