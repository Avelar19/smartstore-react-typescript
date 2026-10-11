import { Alert, Button, Paper, Stack } from '@mantine/core'
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useCategoryOptions } from '../../hooks/useCategoryOptions.ts'
import type { ProductInput } from '../../schemas/adminProduct.ts'
import { ErrorState } from '../ErrorState.tsx'
import { PageLoader } from '../PageLoader.tsx'
import { PageSection } from '../PageSection.tsx'
import { ProductForm } from './ProductForm.tsx'

export const ADMIN_PRODUCTS_PATH = '/admin/products'

interface ProductFormSectionProps {
  title: string
  description: string
  submitLabel: string
  initialValues?: ProductInput
  /** Observação exibida acima do formulário (ex.: edição apenas local). */
  notice?: ReactNode
  onSubmit: (product: ProductInput) => Promise<void>
}

/** Estrutura comum às páginas de cadastro e edição: cabeçalho, categorias e formulário. */
export function ProductFormSection({
  title,
  description,
  submitLabel,
  initialValues,
  notice,
  onSubmit,
}: ProductFormSectionProps) {
  const navigate = useNavigate()
  const { query, options } = useCategoryOptions()

  function renderContent() {
    if (query.status === 'loading') return <PageLoader label="Carregando categorias…" />
    if (query.status === 'error') {
      return (
        <ErrorState title="Não foi possível carregar as categorias" message={query.error.message} onRetry={query.retry} />
      )
    }
    return (
      <ProductForm
        categories={options}
        submitLabel={submitLabel}
        onSubmit={onSubmit}
        onCancel={() => void navigate(ADMIN_PRODUCTS_PATH)}
        {...(initialValues && { initialValues })}
      />
    )
  }

  return (
    <PageSection
      title={title}
      description={description}
      titleOrder={1}
      actions={
        <Button component={Link} to={ADMIN_PRODUCTS_PATH} variant="subtle" leftSection={<IconArrowLeft size={16} aria-hidden />}>
          Voltar para a listagem
        </Button>
      }
    >
      <Stack gap="md" maw={720}>
        {notice && (
          <Alert variant="light" color="grape" icon={<IconInfoCircle aria-hidden />} role="note">
            {notice}
          </Alert>
        )}
        <Paper withBorder p={{ base: 'md', sm: 'lg' }}>
          {renderContent()}
        </Paper>
      </Stack>
    </PageSection>
  )
}
