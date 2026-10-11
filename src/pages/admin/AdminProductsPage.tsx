import { Button, Center, Pagination, Skeleton, Stack, Text, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { AdminProductTable } from '../../components/admin/AdminProductTable.tsx'
import { DeleteProductModal } from '../../components/admin/DeleteProductModal.tsx'
import { EmptyState } from '../../components/EmptyState.tsx'
import { ErrorState } from '../../components/ErrorState.tsx'
import { PageSection } from '../../components/PageSection.tsx'
import { useApiQuery } from '../../hooks/useApiQuery.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useProductChanges } from '../../hooks/useProductChanges.ts'
import { deleteProduct } from '../../services/adminProductService.ts'
import { fetchProducts } from '../../services/productService.ts'
import type { AdminProductRow } from '../../types/admin.ts'
import { notifyAdminError, notifyAdminSuccess } from '../../utils/adminNotifications.ts'
import { applyChangesToPage, toLocalRows } from '../../utils/adminProducts.ts'

export const ADMIN_PAGE_SIZE = 10

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

export function AdminProductsPage() {
  useDocumentTitle('Gerenciar produtos')
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parsePage(searchParams.get('page'))
  const skip = (page - 1) * ADMIN_PAGE_SIZE

  const { changes, generation, isCurrentGeneration, recordDeleted } = useProductChanges()
  const fetchPage = useCallback(
    (signal: AbortSignal) => fetchProducts({ limit: ADMIN_PAGE_SIZE, skip }, signal),
    [skip],
  )
  const pageQuery = useApiQuery(fetchPage)
  const [productToDelete, setProductToDelete] = useState<AdminProductRow | null>(null)

  const localRows = toLocalRows(changes.createdProducts)

  function handlePageChange(nextPage: number) {
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {})
  }

  async function confirmDelete(row: AdminProductRow) {
    const operationGeneration = generation
    try {
      // Produtos criados nesta sessão não existem na API (o DELETE retornaria 404).
      if (row.ref.kind === 'api') await deleteProduct(row.ref.id)
    } catch (error) {
      if (!isCurrentGeneration(operationGeneration)) return
      notifyAdminError('Não foi possível excluir o produto', error)
      throw error
    }
    // A sessão mudou durante a requisição (logout/novo login): o resultado é descartado.
    if (!isCurrentGeneration(operationGeneration)) return
    recordDeleted(operationGeneration, row.ref)
    setProductToDelete(null)
    notifyAdminSuccess(`“${row.title}” foi excluído desta sessão.`)
  }

  function renderApiProducts() {
    if (pageQuery.status === 'loading') {
      return (
        <Stack gap="xs" role="status" aria-label="Carregando produtos">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} height={44} />
          ))}
        </Stack>
      )
    }

    if (pageQuery.status === 'error') {
      return (
        <ErrorState
          title="Não foi possível carregar os produtos"
          message={pageQuery.error.message}
          onRetry={pageQuery.retry}
        />
      )
    }

    const { products, total } = pageQuery.data
    const rows = applyChangesToPage(products, changes)
    const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
    const deletedCount = changes.deletedProductIds.length

    return (
      <Stack gap="md">
        <Text size="sm" c="dimmed" role="status">
          {`${total} produtos na API · página ${page} de ${totalPages}`}
          {deletedCount > 0 && ` · ${deletedCount} excluído(s) nesta sessão`}
        </Text>
        {rows.length > 0 ? (
          <AdminProductTable rows={rows} label="Produtos da API" onDelete={setProductToDelete} />
        ) : (
          <EmptyState
            title="Nenhum produto nesta página"
            description="Os produtos desta página foram excluídos nesta sessão ou a página não existe."
          />
        )}
        {totalPages > 1 && (
          <Center>
            <Pagination
              total={totalPages}
              value={Math.min(page, totalPages)}
              onChange={handlePageChange}
              withEdges
              getItemProps={(item) => ({ 'aria-label': `Página ${item}` })}
            />
          </Center>
        )}
      </Stack>
    )
  }

  return (
    <PageSection
      title="Produtos"
      description="Cadastre, edite e exclua produtos (operações simuladas)."
      titleOrder={1}
      actions={
        <Button component={Link} to="/admin/products/new" leftSection={<IconPlus size={18} aria-hidden />}>
          Novo produto
        </Button>
      }
    >
      {localRows.length > 0 && (
        <Stack gap="sm">
          <Title order={2} size="h4">
            Cadastrados nesta sessão
          </Title>
          <AdminProductTable rows={localRows} label="Produtos cadastrados nesta sessão" onDelete={setProductToDelete} />
        </Stack>
      )}

      <Stack gap="sm">
        <Title order={2} size="h4">
          Produtos da API
        </Title>
        {renderApiProducts()}
      </Stack>

      <DeleteProductModal
        product={productToDelete}
        onCancel={() => setProductToDelete(null)}
        onConfirm={confirmDelete}
      />
    </PageSection>
  )
}
