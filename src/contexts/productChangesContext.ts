import { createContext } from 'react'

import type { ProductInput } from '../schemas/adminProduct.ts'
import type { LocalProduct, ProductRef } from '../types/admin.ts'
import type { ProductChangesState } from './productChangesReducer.ts'

export interface ProductChangesContextValue {
  changes: ProductChangesState
  /**
   * Geração atual da sessão. Capture-a antes de uma requisição e confira com
   * `isCurrentGeneration` ao terminar: se a sessão mudou, o resultado deve ser descartado.
   */
  generation: number
  isCurrentGeneration: (generation: number) => boolean
  /** Registra um cadastro confirmado pela API (POST /products/add). */
  recordCreated: (generation: number, apiId: number, product: ProductInput) => void
  /** Registra uma edição confirmada (PUT) ou local (produto criado nesta sessão). */
  recordUpdated: (generation: number, ref: ProductRef, product: ProductInput) => void
  /** Registra uma exclusão confirmada (DELETE) ou local. */
  recordDeleted: (generation: number, ref: ProductRef) => void
  getLocalProduct: (localId: number) => LocalProduct | undefined
}

export const ProductChangesContext = createContext<ProductChangesContextValue | null>(null)
