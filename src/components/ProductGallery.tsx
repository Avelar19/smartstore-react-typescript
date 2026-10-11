import { Group, Stack, UnstyledButton } from '@mantine/core'
import { useState } from 'react'

import { ProductImage } from './ProductImage.tsx'

interface ProductGalleryProps {
  title: string
  thumbnail: string
  images: readonly string[]
}

export function ProductGallery({ title, thumbnail, images }: ProductGalleryProps) {
  const sources = images.length > 0 ? images : [thumbnail]
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null)
  const currentSrc = selectedSrc !== null && sources.includes(selectedSrc) ? selectedSrc : (sources[0] ?? '')

  return (
    <Stack gap="sm">
      <ProductImage src={currentSrc} alt={title} height={360} />
      {sources.length > 1 && (
        <Group gap="xs">
          {sources.map((src, index) => (
            <UnstyledButton
              key={src}
              onClick={() => setSelectedSrc(src)}
              aria-label={`Ver imagem ${index + 1} de ${title}`}
              aria-pressed={src === currentSrc}
            >
              <ProductImage src={src} alt="" height={64} width={64} />
            </UnstyledButton>
          ))}
        </Group>
      )}
    </Stack>
  )
}
