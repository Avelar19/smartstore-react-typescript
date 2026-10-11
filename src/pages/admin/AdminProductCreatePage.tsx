import { useNavigate } from 'react-router-dom'

import { ADMIN_PRODUCTS_PATH, ProductFormSection } from '../../components/admin/ProductFormSection.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useProductChanges } from '../../hooks/useProductChanges.ts'
import type { ProductInput } from '../../schemas/adminProduct.ts'
import { createProduct } from '../../services/adminProductService.ts'
import { notifyAdminError, notifyAdminSuccess } from '../../utils/adminNotifications.ts'

export function AdminProductCreatePage() {
  useDocumentTitle('Novo produto')
  const navigate = useNavigate()
  const { generation, isCurrentGeneration, recordCreated } = useProductChanges()

  async function handleSubmit(product: ProductInput) {
    const operationGeneration = generation
    try {
      const result = await createProduct(product)
      // A sessão mudou durante a requisição (logout/novo login): o resultado é descartado.
      if (!isCurrentGeneration(operationGeneration)) return
      recordCreated(operationGeneration, result.id, result.product)
      notifyAdminSuccess(`“${result.product.title}” foi cadastrado nesta sessão.`)
      void navigate(ADMIN_PRODUCTS_PATH)
    } catch (error) {
      if (!isCurrentGeneration(operationGeneration)) return
      notifyAdminError('Não foi possível cadastrar o produto', error)
      throw error
    }
  }

  return (
    <ProductFormSection
      title="Novo produto"
      description="Preencha os dados do produto. O cadastro é enviado à DummyJSON, que não o persiste."
      submitLabel="Cadastrar produto"
      onSubmit={handleSubmit}
    />
  )
}
