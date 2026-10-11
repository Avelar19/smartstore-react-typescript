import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/apiError.ts'
import { fetchProductById } from '../services/productService.ts'
import { createDeferred } from '../tests/deferred.ts'
import { getProductFixture } from '../tests/fixtures/products.ts'
import { setupProductServiceMock } from '../tests/productServiceMock.ts'
import { renderRoute } from '../tests/test-utils.tsx'
import type { Product } from '../types/product.ts'

vi.mock('../services/productService.ts')

beforeEach(() => {
  setupProductServiceMock()
})

describe('ProductDetailsPage', () => {
  it('busca o produto pelo id da URL (acesso direto) e exibe os detalhes completos', async () => {
    const pendingProduct = createDeferred<Product>()
    vi.mocked(fetchProductById).mockImplementationOnce(() => pendingProduct.promise)
    renderRoute('/products/4')

    expect(await screen.findByText('Carregando produto…')).toBeInTheDocument()
    pendingProduct.resolve(getProductFixture(4))
    expect(await screen.findByRole('heading', { level: 1, name: 'MacBook Pro 14' })).toBeInTheDocument()
    expect(vi.mocked(fetchProductById)).toHaveBeenCalledWith(4, expect.any(AbortSignal))

    expect(screen.getByText('Notebooks')).toBeInTheDocument()
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('9 unidades em estoque')).toBeInTheDocument()
    expect(screen.getByText(/chip M2 Pro/)).toBeInTheDocument()
    expect(screen.getByText('1 year warranty')).toBeInTheDocument()
    expect(document.title).toBe('MacBook Pro 14 | SmartStore')
  })

  it('exibe imagens reais e permite alternar entre elas', async () => {
    const { user } = renderRoute('/products/4')
    await screen.findByRole('heading', { level: 1, name: 'MacBook Pro 14' })

    expect(screen.getByRole('img', { name: 'MacBook Pro 14' })).toHaveAttribute(
      'src',
      'https://cdn.dummyjson.com/test/4/1.webp',
    )

    await user.click(screen.getByRole('button', { name: 'Ver imagem 2 de MacBook Pro 14' }))

    expect(screen.getByRole('img', { name: 'MacBook Pro 14' })).toHaveAttribute(
      'src',
      'https://cdn.dummyjson.com/test/4/2.webp',
    )
  })

  it.each(['/products/abc', '/products/0', '/products/1.5'])(
    'trata id inválido em %s sem chamar a API',
    async (path) => {
      renderRoute(path)

      // A página é carregada sob demanda (lazy): aguardar em vez de consultar de forma síncrona.
      expect(await screen.findByRole('heading', { name: 'Endereço de produto inválido' })).toBeInTheDocument()
      expect(vi.mocked(fetchProductById)).not.toHaveBeenCalled()
    },
  )

  it('trata produto inexistente (HTTP 404)', async () => {
    renderRoute('/products/999')

    expect(await screen.findByRole('heading', { name: 'Produto não encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/products')
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('trata erro de rede separadamente, com opção de tentar novamente', async () => {
    vi.mocked(fetchProductById).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { user } = renderRoute('/products/4')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar o produto')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Produto não encontrado' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'MacBook Pro 14' })).toBeInTheDocument()
  })

  it('trata erro HTTP do servidor (500)', async () => {
    vi.mocked(fetchProductById).mockRejectedValue(
      new ApiError('http', 'O servidor está indisponível no momento. Tente novamente mais tarde.', {
        status: 500,
      }),
    )
    renderRoute('/products/4')

    expect(await screen.findByText(/servidor está indisponível/)).toBeInTheDocument()
  })
})
