import { useMemo } from 'react'

import { fetchCategories } from '../services/productService.ts'
import type { CategoryOption } from '../types/product.ts'
import { toCategoryOptions } from '../utils/categories.ts'
import type { ApiQueryResult } from './useApiQuery.ts'
import { useApiQuery } from './useApiQuery.ts'
import type { Category } from '../types/product.ts'

interface CategoryOptionsResult {
  query: ApiQueryResult<Category[]>
  /** Opções traduzidas e ordenadas (vazio enquanto carrega ou em caso de erro). */
  options: CategoryOption[]
}

export function useCategoryOptions(): CategoryOptionsResult {
  const query = useApiQuery(fetchCategories)
  const options = useMemo(() => (query.data ? toCategoryOptions(query.data) : []), [query.data])
  return { query, options }
}
