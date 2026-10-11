import { Button } from '@mantine/core'
import { useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ADMIN_PRODUCTS_PATH, ProductFormSection } from '../../components/admin/ProductFormSection.tsx'
import { EmptyState } from '../../components/EmptyState.tsx'
import { ErrorState } from '../../components/ErrorState.tsx'
import { PageLoader } from '../../components/PageLoader.tsx'
import { useApiQuery } from '../../hooks/useApiQuery.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useProductChanges } from '../../hooks/useProductChanges.ts'
import type { ProductInput } from '../../schemas/adminProduct.ts'
import { updateProduct } from '../../services/adminProductService.ts'
import { fetchProductById } from '../../services/productService.ts'
import type { ProductRef } from '../../types/admin.ts'
import { notifyAdminError, notifyAdminSuccess } from '../../utils/adminNotifications.ts'
import { parseRefParam } from '../../utils/productRef.ts'

function BackToListButton() {
  return (
    <Button component={Link} to={ADMIN_PRODUCTS_PATH} variant="light">
      Voltar para a listagem
    </Button>
  )
}

function UnavailableProduct({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState title={title} description={description}>
      <BackToListButton />
    </EmptyState>
  )
}

/** Envia a edição (PUT para produtos da API; apenas local para os criados nesta sessão). */
function useSaveProduct(ref: ProductRef) {
  const navigate = useNavigate()
  const { generation, isCurrentGeneration, recordUpdated } = useProductChanges()

  return async function save(product: ProductInput) {
    const operationGeneration = generation
    try {
      const confirmed = ref.kind === 'api' ? (await updateProduct(ref.id, product)).product : product
      // A sessão mudou durante a requisição (logout/novo login): o resultado é descartado.
      if (!isCurrentGeneration(operationGeneration)) return
      recordUpdated(operationGeneration, ref, confirmed)
      notifyAdminSuccess(`“${confirmed.title}” foi atualizado nesta sessão.`)
      void navigate(ADMIN_PRODUCTS_PATH)
    } catch (error) {
      if (!isCurrentGeneration(operationGeneration)) return
      notifyAdminError('Não foi possível salvar as alterações', error)
      throw error
    }
  }
}

export function AdminProductEditPage() {
  useDocumentTitle('Editar produto')
  const ref = parseRefParam(useParams<'productRef'>().productRef)

  if (ref === null) {
    return <UnavailableProduct title="Endereço inválido" description="O produto informado na URL não é válido." />
  }
  return ref.kind === 'local' ? <EditLocalProduct localId={ref.localId} /> : <EditApiProduct id={ref.id} />
}

function EditLocalProduct({ localId }: { localId: number }) {
  const { getLocalProduct } = useProductChanges()
  const save = useSaveProduct({ kind: 'local', localId })
  const product = getLocalProduct(localId)

  if (!product) {
    return (
      <UnavailableProduct
        title="Produto não encontrado"
        description="Este produto não existe nesta sessão (alterações simuladas são descartadas ao recarregar a página)."
      />
    )
  }

  const { title, description, category, price, stock } = product
  return (
    <ProductFormSection
      title="Editar produto"
      description={title}
      submitLabel="Salvar alterações"
      initialValues={{ title, description, category, price, stock }}
      notice="Este produto foi cadastrado nesta sessão e não existe na DummyJSON (a API devolve sempre o mesmo id para novos produtos). A edição é aplicada apenas localmente."
      onSubmit={save}
    />
  )
}

function EditApiProduct({ id }: { id: number }) {
  const { changes } = useProductChanges()
  const save = useSaveProduct({ kind: 'api', id })
  const fetchProduct = useCallback((signal: AbortSignal) => fetchProductById(id, signal), [id])
  const productQuery = useApiQuery(fetchProduct)

  if (changes.deletedProductIds.includes(id)) {
    return <UnavailableProduct title="Produto excluído" description="Este produto foi excluído nesta sessão." />
  }
  if (productQuery.status === 'loading') return <PageLoader label="Carregando produto…" />
  if (productQuery.status === 'error') {
    if (productQuery.error.status === 404) {
      return <UnavailableProduct title="Produto não encontrado" description="O produto não existe na DummyJSON." />
    }
    return (
      <ErrorState
        title="Não foi possível carregar o produto"
        message={productQuery.error.message}
        onRetry={productQuery.retry}
      />
    )
  }

  // Edições anteriores desta sessão têm prioridade sobre os dados originais da API.
  const { title, description, category, price, stock } = productQuery.data
  const initialValues = changes.updatedProducts[id] ?? { title, description, category, price, stock }

  return (
    <ProductFormSection
      title="Editar produto"
      description={initialValues.title}
      submitLabel="Salvar alterações"
      initialValues={initialValues}
      onSubmit={save}
    />
  )
}
