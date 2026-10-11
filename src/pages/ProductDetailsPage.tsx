import { Badge, Button, Center, Divider, Grid, Group, List, Loader, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { ProductGallery } from '../components/ProductGallery.tsx'
import { ProductRating } from '../components/ProductRating.tsx'
import { useApiQuery } from '../hooks/useApiQuery.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { fetchProductById } from '../services/productService.ts'
import type { Product } from '../types/product.ts'
import { getCategoryLabel } from '../utils/categories.ts'
import { formatPrice } from '../utils/format.ts'

/** Converte o parâmetro da URL em um id válido (inteiro positivo). */
function parseProductId(value: string | undefined): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

function BackToCatalogButton() {
  return (
    <Button component={Link} to="/products" variant="light">
      Voltar ao catálogo
    </Button>
  )
}

export function ProductDetailsPage() {
  const { id } = useParams<'id'>()
  const productId = parseProductId(id)

  if (productId === null) {
    return <InvalidProductId />
  }

  return <ProductDetailsContent productId={productId} />
}

function InvalidProductId() {
  useDocumentTitle('Endereço inválido')

  return (
    <EmptyState title="Endereço de produto inválido" description="O código do produto informado na URL não é válido.">
      <BackToCatalogButton />
    </EmptyState>
  )
}

interface ProductDetailsContentProps {
  productId: number
}

function ProductDetailsContent({ productId }: ProductDetailsContentProps) {
  const fetchProduct = useCallback((signal: AbortSignal) => fetchProductById(productId, signal), [productId])
  const productQuery = useApiQuery(fetchProduct)

  const isNotFound = productQuery.status === 'error' && productQuery.error.status === 404
  useDocumentTitle(
    productQuery.status === 'success'
      ? productQuery.data.title
      : isNotFound
        ? 'Produto não encontrado'
        : 'Detalhes do produto',
  )

  if (productQuery.status === 'loading') {
    return (
      <Center py={80}>
        <Stack align="center" gap="sm" role="status">
          <Loader aria-hidden />
          <Text c="dimmed">Carregando produto…</Text>
        </Stack>
      </Center>
    )
  }

  if (productQuery.status === 'error') {
    if (isNotFound) {
      return (
        <EmptyState
          title="Produto não encontrado"
          description="O produto solicitado não existe ou não está mais disponível."
        >
          <BackToCatalogButton />
        </EmptyState>
      )
    }

    return (
      <Stack gap="md">
        <ErrorState
          title="Não foi possível carregar o produto"
          message={productQuery.error.message}
          onRetry={productQuery.retry}
        />
        <Group>
          <BackToCatalogButton />
        </Group>
      </Stack>
    )
  }

  return <ProductDetailsView product={productQuery.data} />
}

interface ProductDetailsViewProps {
  product: Product
}

function ProductDetailsView({ product }: ProductDetailsViewProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Com histórico interno, volta à página anterior (preservando os filtros do catálogo);
  // em acesso direto pelo link, vai para o catálogo.
  function handleBack() {
    if (location.key === 'default') {
      void navigate('/products')
    } else {
      void navigate(-1)
    }
  }

  const inStock = product.stock > 0
  const policies = [
    { label: 'Garantia', value: product.warrantyInformation },
    { label: 'Envio', value: product.shippingInformation },
    { label: 'Devolução', value: product.returnPolicy },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value))

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} aria-hidden />} onClick={handleBack}>
          Voltar
        </Button>
      </Group>

      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ProductGallery title={product.title} thumbnail={product.thumbnail} images={product.images} />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md">
            <Group gap="xs">
              <Badge variant="light">{getCategoryLabel(product.category)}</Badge>
              {product.brand && <Badge variant="outline">{product.brand}</Badge>}
            </Group>

            <Title order={1}>{product.title}</Title>
            <ProductRating value={product.rating} />

            <Group gap="sm" align="baseline">
              <Text fz={32} fw={800}>
                {formatPrice(product.price)}
              </Text>
              {product.discountPercentage > 0 && (
                <Badge color="green" variant="light">
                  {`${Math.round(product.discountPercentage)}% de desconto`}
                </Badge>
              )}
            </Group>

            <Text c={inStock ? 'teal' : 'red'} fw={500}>
              {inStock ? `${product.stock} unidades em estoque` : 'Produto fora de estoque'}
            </Text>

            <Divider />

            <Stack gap={4}>
              <Title order={2} size="h4">
                Descrição
              </Title>
              <Text>{product.description}</Text>
            </Stack>

            {policies.length > 0 && (
              <Stack gap={4}>
                <Title order={2} size="h4">
                  Informações
                </Title>
                <List size="sm" spacing={4}>
                  {policies.map(({ label, value }) => (
                    <List.Item key={label}>
                      <Text span fw={600} size="sm">
                        {label}:
                      </Text>{' '}
                      {value}
                    </List.Item>
                  ))}
                </List>
              </Stack>
            )}

            {product.tags.length > 0 && (
              <Group gap="xs" aria-label="Tags do produto">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="default" size="sm">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
