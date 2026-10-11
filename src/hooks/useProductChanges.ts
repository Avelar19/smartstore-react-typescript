import { useContext } from 'react'

import { ProductChangesContext } from '../contexts/productChangesContext.ts'
import type { ProductChangesContextValue } from '../contexts/productChangesContext.ts'

export function useProductChanges(): ProductChangesContextValue {
  const context = useContext(ProductChangesContext)

  if (context === null) {
    throw new Error('useProductChanges deve ser usado dentro de <ProductChangesProvider>.')
  }

  return context
}
