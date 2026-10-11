import { Group, Rating, Text, VisuallyHidden } from '@mantine/core'
import type { MantineSize } from '@mantine/core'

import { formatRating } from '../utils/format.ts'

interface ProductRatingProps {
  value: number
  size?: MantineSize
}

export function ProductRating({ value, size = 'sm' }: ProductRatingProps) {
  const formatted = formatRating(value)

  return (
    <Group gap={6} wrap="nowrap">
      <Rating value={value} fractions={10} readOnly size={size} aria-hidden />
      <Text size="sm" c="dimmed" aria-hidden>
        {formatted}
      </Text>
      <VisuallyHidden>{`Avaliação ${formatted} de 5`}</VisuallyHidden>
    </Group>
  )
}
