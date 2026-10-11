import { Card, SimpleGrid, Skeleton, Stack, VisuallyHidden } from '@mantine/core'

interface ProductGridSkeletonProps {
  count: number
  label?: string
}

/** Marcadores de carregamento no mesmo formato da grade de produtos. */
export function ProductGridSkeleton({ count, label = 'Carregando produtos…' }: ProductGridSkeletonProps) {
  return (
    <div role="status" aria-live="polite">
      <VisuallyHidden>{label}</VisuallyHidden>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="lg" aria-hidden>
        {Array.from({ length: count }, (_, index) => (
          <Card key={index} withBorder padding="md">
            <Card.Section>
              <Skeleton height={180} radius={0} />
            </Card.Section>
            <Stack gap="xs" mt="md">
              <Skeleton height={18} width="40%" />
              <Skeleton height={20} width="85%" />
              <Skeleton height={14} width="50%" />
              <Skeleton height={28} mt="sm" />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  )
}
