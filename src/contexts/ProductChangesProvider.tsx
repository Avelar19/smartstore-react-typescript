import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useAuth } from '../hooks/useAuth.ts'
import type { ProductInput } from '../schemas/adminProduct.ts'
import type { ProductRef } from '../types/admin.ts'
import { ProductChangesContext } from './productChangesContext.ts'
import type { ProductChangesContextValue } from './productChangesContext.ts'
import { initialProductChangesState, productChangesReducer } from './productChangesReducer.ts'

interface ProductChangesProviderProps {
  children: ReactNode
}

/**
 * Mantém as alterações simuladas em memória (sem localStorage: a DummyJSON não persiste
 * escritas, e simular um banco no navegador daria a falsa impressão de dados gravados).
 * Recarregar a página descarta as alterações; trocar de usuário (logout/login) também.
 */
export function ProductChangesProvider({ children }: ProductChangesProviderProps) {
  const { user } = useAuth()
  const ownerId = user?.id ?? null
  const [changes, dispatch] = useReducer(productChangesReducer, initialProductChangesState)

  // As alterações pertencem ao usuário que as fez: ao mudar a sessão, o estado é zerado
  // (ajuste de estado durante a renderização, sem efeito extra).
  const [changesOwnerId, setChangesOwnerId] = useState(ownerId)
  if (ownerId !== changesOwnerId) {
    setChangesOwnerId(ownerId)
    dispatch({ type: 'reset' })
  }

  // Geração confirmada (após o commit), consultada quando uma requisição assíncrona termina.
  const committedGenerationRef = useRef(changes.generation)
  useEffect(() => {
    committedGenerationRef.current = changes.generation
  }, [changes.generation])

  const isCurrentGeneration = useCallback(
    (generation: number) => generation === committedGenerationRef.current,
    [],
  )

  const recordCreated = useCallback((generation: number, apiId: number, product: ProductInput) => {
    dispatch({ type: 'created', generation, apiId, product })
  }, [])

  const recordUpdated = useCallback((generation: number, ref: ProductRef, product: ProductInput) => {
    dispatch({ type: 'updated', generation, ref, product })
  }, [])

  const recordDeleted = useCallback((generation: number, ref: ProductRef) => {
    dispatch({ type: 'deleted', generation, ref })
  }, [])

  const value = useMemo<ProductChangesContextValue>(
    () => ({
      changes,
      generation: changes.generation,
      isCurrentGeneration,
      recordCreated,
      recordUpdated,
      recordDeleted,
      getLocalProduct: (localId) => changes.createdProducts.find((product) => product.localId === localId),
    }),
    [changes, isCurrentGeneration, recordCreated, recordUpdated, recordDeleted],
  )

  return <ProductChangesContext.Provider value={value}>{children}</ProductChangesContext.Provider>
}
