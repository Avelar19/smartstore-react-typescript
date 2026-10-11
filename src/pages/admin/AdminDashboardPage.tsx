import { Avatar, Badge, Button, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core'
import {
  IconCategory,
  IconCurrencyDollar,
  IconPackage,
  IconPackageOff,
  IconPlus,
  IconStack2,
  IconStar,
} from '@tabler/icons-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { StatCard } from '../../components/admin/StatCard.tsx'
import { ErrorState } from '../../components/ErrorState.tsx'
import { PageSection } from '../../components/PageSection.tsx'
import { useApiQuery } from '../../hooks/useApiQuery.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import { useCategoryOptions } from '../../hooks/useCategoryOptions.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useProductChanges } from '../../hooks/useProductChanges.ts'
import { fetchCatalogStats } from '../../services/productService.ts'
import { computeCatalogStats } from '../../utils/catalogStats.ts'
import { formatPrice, formatRating } from '../../utils/format.ts'

const integerFormatter = new Intl.NumberFormat('pt-BR')

export function AdminDashboardPage() {
  useDocumentTitle('Painel administrativo')
  const { user } = useAuth()
  const { changes } = useProductChanges()
  const statsQuery = useApiQuery(fetchCatalogStats)
  const { query: categoriesQuery } = useCategoryOptions()

  const stats = useMemo(() => (statsQuery.data ? computeCatalogStats(statsQuery.data) : null), [statsQuery.data])

  function retryFailed() {
    if (statsQuery.status === 'error') statsQuery.retry()
    if (categoriesQuery.status === 'error') categoriesQuery.retry()
  }

  function renderStats() {
    const failed = statsQuery.status === 'error' ? statsQuery.error : categoriesQuery.error
    if (failed) {
      return (
        <ErrorState title="Não foi possível carregar os indicadores" message={failed.message} onRetry={retryFailed} />
      )
    }

    if (!stats || categoriesQuery.status !== 'success') {
      return (
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} role="status" aria-label="Carregando indicadores">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height={96} />
          ))}
        </SimpleGrid>
      )
    }

    return (
      <Stack gap="xs">
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
          <StatCard label="Produtos na API" value={integerFormatter.format(stats.totalProducts)} icon={IconPackage} />
          <StatCard
            label="Categorias"
            value={integerFormatter.format(categoriesQuery.data.length)}
            icon={IconCategory}
            hint={`${stats.categoriesInUse} com produtos cadastrados`}
          />
          <StatCard label="Unidades em estoque" value={integerFormatter.format(stats.totalStock)} icon={IconStack2} />
          <StatCard label="Produtos esgotados" value={integerFormatter.format(stats.outOfStock)} icon={IconPackageOff} />
          <StatCard label="Preço médio" value={formatPrice(stats.averagePrice)} icon={IconCurrencyDollar} />
          <StatCard label="Avaliação média" value={`${formatRating(stats.averageRating)} / 5`} icon={IconStar} />
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          {`Indicadores calculados sobre ${stats.analyzedProducts} de ${stats.totalProducts} produtos da DummyJSON (dados originais, sem as alterações simuladas).`}
        </Text>
      </Stack>
    )
  }

  return (
    <PageSection
      title="Painel administrativo"
      description={user ? `Olá, ${user.firstName}! Você está autenticado na SmartStore.` : 'Área restrita da SmartStore.'}
      titleOrder={1}
      actions={
        <Group gap="sm">
          <Button component={Link} to="/admin/products" variant="light" leftSection={<IconPackage size={18} aria-hidden />}>
            Gerenciar produtos
          </Button>
          <Button component={Link} to="/admin/products/new" leftSection={<IconPlus size={18} aria-hidden />}>
            Novo produto
          </Button>
        </Group>
      }
    >
      {user && (
        <Paper withBorder p="lg">
          <Group wrap="nowrap">
            <Avatar src={user.image} alt="" size="lg" radius="xl" />
            <Stack gap={2}>
              <Text fw={600}>{`${user.firstName} ${user.lastName}`}</Text>
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
              <Group gap="xs">
                <Badge variant="light">{`@${user.username}`}</Badge>
                {user.role && <Badge variant="outline">{user.role}</Badge>}
              </Group>
            </Stack>
          </Group>
        </Paper>
      )}

      <Stack gap="sm">
        <Title order={2} size="h3">
          Catálogo
        </Title>
        {renderStats()}
      </Stack>

      <Paper withBorder p="lg">
        <Stack gap="xs">
          <Title order={2} size="h4">
            Alterações simuladas nesta sessão
          </Title>
          <Group gap="xs">
            <Badge variant="light" color="grape">{`${changes.createdProducts.length} cadastrado(s)`}</Badge>
            <Badge variant="light" color="blue">{`${Object.keys(changes.updatedProducts).length} editado(s)`}</Badge>
            <Badge variant="light" color="red">{`${changes.deletedProductIds.length} excluído(s)`}</Badge>
          </Group>
        </Stack>
      </Paper>
    </PageSection>
  )
}
