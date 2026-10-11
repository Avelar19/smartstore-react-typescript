import { Center, Image } from '@mantine/core'
import { IconPhoto } from '@tabler/icons-react'
import { useState } from 'react'

import classes from './ProductImage.module.css'

interface ProductImageProps {
  src: string
  alt: string
  height: number
  width?: number
  /** Adia o download até a imagem se aproximar da área visível. */
  lazy?: boolean
}

/** Imagem do produto com marcador visual quando não há URL ou o carregamento falha. */
export function ProductImage({ src, alt, height, width, lazy = false }: ProductImageProps) {
  // Guarda a URL que falhou: se o src mudar, a nova imagem é tentada normalmente.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <Center h={height} w={width} className={classes.placeholder} role="img" aria-label={alt}>
        <IconPhoto size={40} stroke={1.2} aria-hidden />
      </Center>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      h={height}
      w={width}
      fit="contain"
      loading={lazy ? 'lazy' : 'eager'}
      onError={() => setFailedSrc(src)}
    />
  )
}
