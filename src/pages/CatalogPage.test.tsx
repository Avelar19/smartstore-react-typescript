import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/apiError.ts'
import { fetchCatalogPage, fetchCategories } from '../services/productService.ts'
import { createDeferred } from '../tests/deferred.ts'
import { createProductPage, productFixtures } from '../tests/fixtures/products.ts'
import { setupProductServiceMock } from '../tests/productServiceMock.ts'
import { renderRoute } from '../tests/test-utils.tsx'
import type { ProductPage } from '../types/product.ts'

vi.mock('../services/productService.ts')

beforeEach(() => {
  setupProductServiceMock()
})

function getProductHeadings() {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

async function findResultsStatus() {
  return screen.findByText(/produtos? encontrados?/)
}

describe('CatalogPage', () => {
  it('exibe carregamento e depois a primeira página com o total real', async () => {
    const pendingPage = createDeferred<ProductPage>()
    vi.mocked(fetchCatalogPage).mockImplementationOnce(() => pendingPage.promise)
    renderRoute('/products')

    expect(await screen.findByText('Carregando produtos…')).toBeInTheDocument()
    pendingPage.resolve(createProductPage(productFixtures, { limit: 8, skip: 0 }))
    expect(await findResultsStatus()).toHaveTextContent('12 produtos encontrados · página 1 de 2')
    expect(getProductHeadings()).toHaveLength(8)
    expect(vi.mocked(fetchCatalogPage)).toHaveBeenLastCalledWith(
      { search: '', category: null, limit: 8, skip: 0 },
      expect.any(AbortSignal),
    )
  })

  it('pagina usando limit e skip e registra a página na URL', async () => {
    const { user, router } = renderRoute('/products')
    await findResultsStatus()

    await user.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByText(/página 2 de 2/)).toBeInTheDocument()
    expect(getProductHeadings()).toHaveLength(4)
    expect(router.state.location.search).toBe('?page=2')
    expect(vi.mocked(fetchCatalogPage)).toHaveBeenLastCalledWith(
      { search: '', category: null, limit: 8, skip: 8 },
      expect.any(AbortSignal),
    )
  })

  it('busca produtos pelo nome após a digitação', async () => {
    const { user, router } = renderRoute('/products')
    await findResultsStatus()

    await user.click(screen.getByRole('searchbox', { name: 'Buscar produtos' }))
    await user.paste('iphone')

    expect(await screen.findByText('1 produto encontrado para “iphone”')).toBeInTheDocument()
    expect(getProductHeadings()).toEqual(['iPhone 13 Pro'])
    expect(router.state.location.search).toBe('?q=iphone')
    expect(vi.mocked(fetchCatalogPage)).toHaveBeenLastCalledWith(
      { search: 'iphone', category: null, limit: 8, skip: 0 },
      expect.any(AbortSignal),
    )
    const searchCalls = vi.mocked(fetchCatalogPage).mock.calls.filter(([query]) => query.search !== '')
    expect(searchCalls).toHaveLength(1)
  })

  it('apagar a busca restaura a listagem completa imediatamente', async () => {
    const { user, router } = renderRoute('/products?q=dior')
    await screen.findByText('1 produto encontrado para “dior”')

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar produtos' }))

    // Sem esperar o debounce: a limpeza é aplicada na hora.
    expect(router.state.location.search).toBe('')
    expect(await findResultsStatus()).toHaveTextContent('12 produtos encontrados')
  })

  it('não perde caracteres quando a busca é aplicada no meio da digitação', async () => {
    const { user, router } = renderRoute('/products')
    await findResultsStatus()
    const searchInput = screen.getByRole('searchbox', { name: 'Buscar produtos' })

    await user.type(searchInput, 'i')
    await waitFor(() => expect(router.state.location.search).toBe('?q=i'))
    await user.type(searchInput, 'phone')

    expect(searchInput).toHaveValue('iphone')
    expect(await screen.findByText('1 produto encontrado para “iphone”')).toBeInTheDocument()
  })

  it('aplica a busca a partir da página 2 sem requisição intermediária do catálogo geral', async () => {
    const { user, router } = renderRoute('/products?page=2')
    await screen.findByText(/página 2 de 2/)
    const callsBefore = vi.mocked(fetchCatalogPage).mock.calls.length

    await user.type(screen.getByRole('searchbox', { name: 'Buscar produtos' }), 'dell')

    expect(await screen.findByText('1 produto encontrado para “dell”')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=dell')
    // Nenhuma requisição intermediária "sem busca" (página 1 do catálogo geral) é disparada.
    const newCalls = vi.mocked(fetchCatalogPage).mock.calls.slice(callsBefore).map(([query]) => query)
    expect(newCalls.every((query) => query.search !== '' && query.skip === 0)).toBe(true)
    expect(newCalls.at(-1)).toEqual({ search: 'dell', category: null, limit: 8, skip: 0 })
  })

  it('sincroniza o campo de busca quando a URL muda por navegação', async () => {
    const { router } = renderRoute('/products?q=dior')
    await screen.findByText('1 produto encontrado para “dior”')

    await act(() => router.navigate('/products?q=dell'))

    expect(screen.getByRole('searchbox', { name: 'Buscar produtos' })).toHaveValue('dell')
    expect(await screen.findByText('1 produto encontrado para “dell”')).toBeInTheDocument()
  })

  it('filtra por categoria com rótulo traduzido e slug original', async () => {
    const { user, router } = renderRoute('/products')
    await findResultsStatus()

    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: 'Notebooks' }))

    expect(await screen.findByText('3 produtos encontrados em Notebooks')).toBeInTheDocument()
    expect(getProductHeadings()).toEqual(['MacBook Pro 14', 'Lenovo Yoga 920', 'Dell XPS 13'])
    expect(router.state.location.search).toBe('?category=laptops')
    expect(vi.mocked(fetchCatalogPage)).toHaveBeenLastCalledWith(
      { search: '', category: 'laptops', limit: 8, skip: 0 },
      expect.any(AbortSignal),
    )
  })

  it('mantém busca e categoria exclusivas (limitação da API)', async () => {
    const { user, router } = renderRoute('/products?category=laptops')
    await screen.findByText('3 produtos encontrados em Notebooks')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar produtos' }), 'dior')

    expect(await screen.findByText('1 produto encontrado para “dior”')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=dior')
    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveValue('')
  })

  it('restaura os filtros a partir da URL (acesso direto)', async () => {
    renderRoute('/products?category=fragrances')

    expect(await screen.findByText('3 produtos encontrados em Perfumes')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveValue('Perfumes'))
  })

  it('exibe estado vazio e permite limpar os filtros', async () => {
    const { user } = renderRoute('/products?q=inexistente')

    expect(await screen.findByRole('heading', { name: 'Nenhum produto encontrado' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    expect(await findResultsStatus()).toHaveTextContent('12 produtos encontrados')
    expect(screen.getByRole('searchbox', { name: 'Buscar produtos' })).toHaveValue('')
  })

  it('trata página fora do intervalo', async () => {
    const { user } = renderRoute('/products?page=9')

    expect(await screen.findByRole('heading', { name: 'Página inexistente' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir para a primeira página' }))
    expect(await findResultsStatus()).toHaveTextContent('página 1 de 2')
  })

  it('exibe erro de conexão e recupera ao tentar novamente', async () => {
    vi.mocked(fetchCatalogPage).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { user } = renderRoute('/products')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar os produtos')).toBeInTheDocument()
    expect(within(alert).getByText(/Verifique sua conexão/)).toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await findResultsStatus()).toHaveTextContent('12 produtos encontrados')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('recupera produtos e categorias após uma queda de conexão', async () => {
    const offline = new ApiError('network', 'Não foi possível conectar ao servidor.')
    vi.mocked(fetchCatalogPage).mockRejectedValueOnce(offline)
    vi.mocked(fetchCategories).mockRejectedValueOnce(offline)
    const { user } = renderRoute('/products')

    expect(await screen.findByText('Não foi possível carregar as categorias.')).toBeInTheDocument()
    await user.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Tentar novamente' }))

    expect(await findResultsStatus()).toHaveTextContent('12 produtos encontrados')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Categoria' })).toBeEnabled())
    expect(screen.queryByText('Não foi possível carregar as categorias.')).not.toBeInTheDocument()
  })

  it('exibe erro de validação sem quebrar a página', async () => {
    vi.mocked(fetchCatalogPage).mockRejectedValue(
      new ApiError('validation', 'Os dados recebidos do servidor estão em um formato inesperado.'),
    )
    renderRoute('/products')

    expect(await screen.findByText(/formato inesperado/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
  })

  it('mantém o catálogo funcionando quando as categorias falham', async () => {
    vi.mocked(fetchCategories).mockRejectedValue(new ApiError('http', 'Erro', { status: 500 }))
    renderRoute('/products')

    expect(await screen.findByText('Não foi possível carregar as categorias.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Categoria' })).toBeDisabled()
    expect(await findResultsStatus()).toHaveTextContent('12 produtos encontrados')
  })

  it('ignora a resposta atrasada de uma página anterior', async () => {
    const firstPage = createDeferred<ProductPage>()
    vi.mocked(fetchCatalogPage).mockImplementationOnce(() => firstPage.promise)
    const { user } = renderRoute('/products')

    // Página 1 ainda pendente: o usuário troca para a categoria Perfumes.
    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: 'Perfumes' }))
    expect(await screen.findByText('3 produtos encontrados em Perfumes')).toBeInTheDocument()

    // A resposta antiga chega depois e não deve sobrescrever o resultado atual.
    firstPage.resolve(createProductPage(productFixtures, { limit: 8, skip: 0 }))
    await firstPage.promise

    expect(screen.getByText('3 produtos encontrados em Perfumes')).toBeInTheDocument()
    expect(getProductHeadings()).toEqual(['Chanel Coco Noir', 'Dior J’adore', 'Calvin Klein CK One'])
    const firstSignal = vi.mocked(fetchCatalogPage).mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(true)
  })
})
