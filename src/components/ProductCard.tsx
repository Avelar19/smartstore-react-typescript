import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'

import type { ProductSummary } from '../types/product.ts'
import { getCategoryLabel } from '../utils/categories.ts'
import { formatPrice } from '../utils/format.ts'
import classes from './ProductCard.module.css'
import { ProductImage } from './ProductImage.tsx'
import { ProductRating } from './ProductRating.tsx'

interface ProductCardProps {
  product: ProductSummary
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card component="article" withBorder padding="md" className={classes.card}>
      <Card.Section>
        <ProductImage src={product.thumbnail} alt={product.title} height={180} lazy />
      </Card.Section>

      <Stack gap="xs" mt="md" className={classes.body}>
        <Badge variant="light" size="sm">
          {getCategoryLabel(product.category)}
        </Badge>
        <Title order={3} size="h5" lineClamp={2}>
          {product.title}
        </Title>
        <ProductRating value={product.rating} size="xs" />

        <Group justify="space-between" mt="auto" pt="xs" wrap="nowrap">
          <Text fw={700} size="lg">
            {formatPrice(product.price)}
          </Text>
          <Button
            component={Link}
            to={`/products/${product.id}`}
            size="xs"
            variant="light"
            aria-label={`Ver detalhes de ${product.title}`}
          >
            Detalhes
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}
