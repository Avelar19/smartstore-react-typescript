import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../tests/test-utils.tsx'
import type { ProductSummary } from '../types/product.ts'
import { ProductCard } from './ProductCard.tsx'

const product: ProductSummary = {
  id: 42,
  title: 'Fone Bluetooth',
  category: 'mobile-accessories',
  price: 59.9,
  discountPercentage: 5,
  rating: 4.25,
  stock: 10,
  thumbnail: 'https://cdn.dummyjson.com/fone/thumbnail.webp',
}

function renderCard(item: ProductSummary = product) {
  return renderWithProviders(
    <MemoryRouter>
      <ProductCard product={item} />
    </MemoryRouter>,
  )
}

describe('ProductCard', () => {
  it('exibe nome, categoria traduzida, preço, avaliação e link para os detalhes', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Fone Bluetooth' })).toBeInTheDocument()
    expect(screen.getByText('Acessórios para celular')).toBeInTheDocument()
    expect(screen.getByText(/US\$\s59,90/)).toBeInTheDocument()
    expect(screen.getByText('Avaliação 4,3 de 5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalhes de Fone Bluetooth' })).toHaveAttribute(
      'href',
      '/products/42',
    )
  })

  it('exibe a imagem real e troca por um marcador quando ela falha', () => {
    renderCard()
    const image = screen.getByRole('img', { name: 'Fone Bluetooth' })
    expect(image).toHaveAttribute('src', product.thumbnail)

    fireEvent.error(image)

    const placeholder = screen.getByRole('img', { name: 'Fone Bluetooth' })
    expect(placeholder.tagName).not.toBe('IMG')
  })

  it('exibe o marcador quando o produto não tem imagem', () => {
    renderCard({ ...product, thumbnail: '' })

    expect(screen.getByRole('img', { name: 'Fone Bluetooth' }).tagName).not.toBe('IMG')
  })
})
