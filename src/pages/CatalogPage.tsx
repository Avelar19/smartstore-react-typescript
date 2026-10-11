import { Button, Center, Pagination, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedCallback } from '@mantine/hooks'
import { IconInfoCircle, IconSearch } from '@tabler/icons-react'
import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { PageSection } from '../components/PageSection.tsx'
import { ProductGrid } from '../components/ProductGrid.tsx'
import { ProductGridSkeleton } from '../components/ProductGridSkeleton.tsx'
import { useApiQuery } from '../hooks/useApiQuery.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { fetchCatalogPage, fetchCategories } from '../services/productService.ts'
import { parseCatalogParams } from '../utils/catalogParams.ts'
import { getCategoryLabel, toCategoryOptions } from '../utils/categories.ts'

export const CATALOG_PAGE_SIZE = 8
export const SEARCH_DEBOUNCE_MS = 300

const paginationControlLabels = {
  first: 'Primeira página',
  previous: 'Página anterior',
  next: 'Próxima página',
  last: 'Última página',
} as const

function getPaginationControlProps(control: keyof typeof paginationControlLabels) {
  return { 'aria-label': paginationControlLabels[control] }
}

function getPaginationItemProps(page: number) {
  return { 'aria-label': `Página ${page}` }
}

function describeResults(total: number, search: string, category: string | null): string {
  const count = total === 1 ? '1 produto encontrado' : `${total} produtos encontrados`
  if (search) return `${count} para “${search}”`
  if (category) return `${count} em ${getCategoryLabel(category)}`
  return count
}

export function CatalogPage() {
  useDocumentTitle('Catálogo')

  // Os filtros ficam na URL: sobrevivem ao recarregamento, ao "Voltar" e podem ser compartilhados.
  const [searchParams, setSearchParams] = useSearchParams()
  const { search, category, page } = parseCatalogParams(searchParams)

  const activeSearch = search.trim()
  const skip = (page - 1) * CATALOG_PAGE_SIZE

  // O campo de busca guarda o rascunho digitado; a URL guarda o filtro aplicado.
  // Quando a URL muda por fora (Voltar, "Limpar filtros", categoria), o rascunho é sincronizado
  // durante a renderização. Se a URL apenas confirma o valor que o próprio campo aplicou, o rascunho
  // é mantido — o usuário pode ter continuado digitando enquanto a navegação (assíncrona) acontecia.
  const [searchDraft, setSearchDraft] = useState(search)
  const [syncedSearch, setSyncedSearch] = useState(search)
  const [lastAppliedSearch, setLastAppliedSearch] = useState<string | null>(null)
  if (search !== syncedSearch) {
    setSyncedSearch(search)
    if (search !== lastAppliedSearch) {
      setSearchDraft(search)
      setLastAppliedSearch(null)
    }
  }

  const fetchPage = useCallback(
    (signal: AbortSignal) =>
      fetchCatalogPage({ search: activeSearch, category, limit: CATALOG_PAGE_SIZE, skip }, signal),
    [activeSearch, category, skip],
  )
  const productsQuery = useApiQuery(fetchPage)
  const categoriesQuery = useApiQuery(fetchCategories)

  const categoryOptions = useMemo(
    () => (categoriesQuery.data ? toCategoryOptions(categoriesQuery.data) : []),
    [categoriesQuery.data],
  )

  function updateParams(changes: Record<string, string | null>, replace = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace },
    )
  }

  // Busca e categoria são exclusivas: a DummyJSON não oferece endpoint que combine os dois filtros.
  // A busca é aplicada em uma única atualização da URL (q, page e category juntos) após a pausa na
  // digitação, gerando uma única requisição por termo.
  const applySearch = useDebouncedCallback((value: string) => {
    const trimmed = value.trim()
    setLastAppliedSearch(trimmed)
    updateParams({ q: trimmed || null, category: null, page: null }, true)
  }, SEARCH_DEBOUNCE_MS)

  function handleSearchChange(value: string) {
    setSearchDraft(value)
    applySearch(value)
    // Apagar o texto restaura a listagem imediatamente.
    if (value.trim() === '') applySearch.flush()
  }

  function handleCategoryChange(value: string | null) {
    applySearch.cancel()
    updateParams({ category: value, q: null, page: null })
  }

  function handlePageChange(nextPage: number) {
    updateParams({ page: nextPage > 1 ? String(nextPage) : null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearFilters() {
    applySearch.cancel()
    setSearchParams({})
  }

  // Uma falha de conexão costuma derrubar as duas requisições; "Tentar novamente" recupera ambas.
  function retryFailedQueries() {
    productsQuery.retry()
    if (categoriesQuery.status === 'error') categoriesQuery.retry()
  }

  function renderResults() {
    if (productsQuery.status === 'loading') {
      return <ProductGridSkeleton count={CATALOG_PAGE_SIZE} />
    }

    if (productsQuery.status === 'error') {
      return (
        <ErrorState
          title="Não foi possível carregar os produtos"
          message={productsQuery.error.message}
          onRetry={retryFailedQueries}
        />
      )
    }

    const { products, total } = productsQuery.data
    const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE)

    if (total === 0) {
      return (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Tente buscar por outro termo ou selecionar outra categoria."
        >
          <Button variant="light" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </EmptyState>
      )
    }

    if (products.length === 0) {
      return (
        <EmptyState title="Página inexistente" description={`Esta listagem possui apenas ${totalPages} página(s).`}>
          <Button variant="light" onClick={() => handlePageChange(1)}>
            Ir para a primeira página
          </Button>
        </EmptyState>
      )
    }

    return (
      <Stack gap="lg">
        <Text size="sm" c="dimmed" role="status">
          {describeResults(total, activeSearch, category)}
          {totalPages > 1 && ` · página ${page} de ${totalPages}`}
        </Text>
        <ProductGrid products={products} />
        {totalPages > 1 && (
          <Center>
            <Pagination
              total={totalPages}
              value={page}
              onChange={handlePageChange}
              withEdges
              getControlProps={getPaginationControlProps}
              getItemProps={getPaginationItemProps}
            />
          </Center>
        )}
      </Stack>
    )
  }

  return (
    <PageSection
      title="Catálogo"
      description="Pesquise por nome ou filtre por categoria para encontrar o produto ideal."
      titleOrder={1}
    >
      <Stack gap="xs">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            type="search"
            label="Buscar produtos"
            placeholder="Ex.: iPhone, perfume, notebook..."
            leftSection={<IconSearch size={16} aria-hidden />}
            value={searchDraft}
            onChange={(event) => handleSearchChange(event.currentTarget.value)}
          />
          <Select
            label="Categoria"
            placeholder={categoriesQuery.status === 'loading' ? 'Carregando categorias…' : 'Todas as categorias'}
            data={categoryOptions}
            value={category}
            onChange={handleCategoryChange}
            disabled={categoriesQuery.status !== 'success'}
            error={categoriesQuery.status === 'error' ? 'Não foi possível carregar as categorias.' : undefined}
            searchable
            clearable
            nothingFoundMessage="Nenhuma categoria encontrada"
          />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          <IconInfoCircle size={14} aria-hidden style={{ verticalAlign: 'middle', marginRight: 4 }} />
          A busca por nome e o filtro por categoria são usados separadamente: ao aplicar um, o outro é
          limpo.
        </Text>
      </Stack>

      {renderResults()}
    </PageSection>
  )
}
