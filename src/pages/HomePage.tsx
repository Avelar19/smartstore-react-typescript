import { Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import type { Icon } from '@tabler/icons-react'
import { IconArrowRight, IconCategory, IconSearch, IconStar } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { ErrorState } from '../components/ErrorState.tsx'
import { PageSection } from '../components/PageSection.tsx'
import { ProductGrid } from '../components/ProductGrid.tsx'
import { ProductGridSkeleton } from '../components/ProductGridSkeleton.tsx'
import { useApiQuery } from '../hooks/useApiQuery.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { fetchProducts } from '../services/productService.ts'
import classes from './HomePage.module.css'

interface Highlight {
  icon: Icon
  title: string
  description: string
}

const highlights: readonly Highlight[] = [
  {
    icon: IconSearch,
    title: 'Busca rápida',
    description: 'Encontre produtos pelo nome em poucos segundos.',
  },
  {
    icon: IconCategory,
    title: 'Categorias',
    description: 'Navegue por mais de 20 categorias, de smartphones a perfumes.',
  },
  {
    icon: IconStar,
    title: 'Avaliações',
    description: 'Compare preços e notas antes de decidir.',
  },
]

const FEATURED_LIMIT = 4

// Definida fora do componente para manter a mesma referência entre renderizações.
function fetchFeaturedProducts(signal: AbortSignal) {
  return fetchProducts({ limit: FEATURED_LIMIT, skip: 0, sortBy: 'rating', order: 'desc' }, signal)
}

export function HomePage() {
  useDocumentTitle('')
  const featuredQuery = useApiQuery(fetchFeaturedProducts)

  return (
    <Stack gap={48}>
      <section className={classes.hero}>
        <Stack gap="lg">
          <Title order={1} className={classes.heroTitle}>
            Tecnologia, beleza e casa em um só lugar
          </Title>
          <Text size="lg" className={classes.heroText}>
            Bem-vindo à SmartStore: explore centenas de produtos, compare avaliações e descubra os
            itens mais bem avaliados da loja.
          </Text>
          <Group>
            <Button
              component={Link}
              to="/products"
              size="md"
              variant="white"
              rightSection={<IconArrowRight size={18} aria-hidden />}
            >
              Explorar catálogo
            </Button>
          </Group>
        </Stack>
      </section>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {highlights.map(({ icon: HighlightIcon, title, description }) => (
          <Paper key={title} withBorder p="lg">
            <Group wrap="nowrap" align="flex-start">
              <ThemeIcon size={44} variant="light">
                <HighlightIcon size={24} stroke={1.6} aria-hidden />
              </ThemeIcon>
              <Stack gap={4}>
                <Title order={2} size="h4">
                  {title}
                </Title>
                <Text size="sm" c="dimmed">
                  {description}
                </Text>
              </Stack>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <PageSection
        title="Produtos em destaque"
        description="Os itens mais bem avaliados pelos nossos clientes."
        actions={
          <Button component={Link} to="/products" variant="subtle" rightSection={<IconArrowRight size={16} aria-hidden />}>
            Ver todos
          </Button>
        }
      >
        {featuredQuery.status === 'loading' && (
          <ProductGridSkeleton count={FEATURED_LIMIT} label="Carregando produtos em destaque…" />
        )}
        {featuredQuery.status === 'error' && (
          <ErrorState
            title="Não foi possível carregar os destaques"
            message={featuredQuery.error.message}
            onRetry={featuredQuery.retry}
          />
        )}
        {featuredQuery.status === 'success' && <ProductGrid products={featuredQuery.data.products} />}
      </PageSection>
    </Stack>
  )
}
