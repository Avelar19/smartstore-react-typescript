export interface CatalogParams {
  search: string
  category: string | null
  page: number
}

/** Lê os filtros do catálogo da URL (?q=, ?category=, ?page=), com valores seguros por padrão. */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogParams {
  const page = Number(searchParams.get('page'))

  return {
    search: searchParams.get('q') ?? '',
    category: searchParams.get('category') || null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}
