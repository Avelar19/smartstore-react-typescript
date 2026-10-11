import { SimpleGrid } from '@mantine/core'
import { memo } from 'react'

import type { ProductSummary } from '../types/product.ts'
import { ProductCard } from './ProductCard.tsx'

interface ProductGridProps {
  products: readonly ProductSummary[]
}

// Memorizado: digitar na busca não renderiza novamente os cards enquanto a lista não muda.
export const ProductGrid = memo(function ProductGrid({ products }: ProductGridProps) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }} spacing="lg">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </SimpleGrid>
  )
})
