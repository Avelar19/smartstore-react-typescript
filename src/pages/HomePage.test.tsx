import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/apiError.ts'
import { fetchProducts } from '../services/productService.ts'
import { setupProductServiceMock } from '../tests/productServiceMock.ts'
import { renderRoute } from '../tests/test-utils.tsx'

vi.mock('../services/productService.ts')

beforeEach(() => {
  setupProductServiceMock()
})

describe('HomePage', () => {
  it('carrega os 4 produtos mais bem avaliados da API', async () => {
    renderRoute('/')

    expect(screen.getByText('Carregando produtos em destaque…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'MacBook Pro 14' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    expect(vi.mocked(fetchProducts)).toHaveBeenCalledWith(
      { limit: 4, skip: 0, sortBy: 'rating', order: 'desc' },
      expect.any(AbortSignal),
    )
  })

  it('exibe falha da API sem quebrar a página e permite tentar novamente', async () => {
    vi.mocked(fetchProducts).mockRejectedValueOnce(
      new ApiError('timeout', 'O servidor demorou demais para responder. Tente novamente.'),
    )
    const { user } = renderRoute('/')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar os destaques')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findAllByRole('heading', { level: 3 })).toHaveLength(4)
  })
})
