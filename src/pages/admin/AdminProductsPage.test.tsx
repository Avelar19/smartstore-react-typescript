import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/apiError.ts'
import { createProduct, deleteProduct, updateProduct } from '../../services/adminProductService.ts'
import { fetchCategories, fetchProductById, fetchProducts } from '../../services/productService.ts'
import type { ProductPage } from '../../types/product.ts'
import { setupAdminProductServiceMock } from '../../tests/adminProductServiceMock.ts'
import { fillProductForm, findProductRow, getTableRows, renderAdminRoute } from '../../tests/adminTestUtils.ts'
import { setupAuthServiceMock } from '../../tests/authServiceMock.ts'
import { createDeferred } from '../../tests/deferred.ts'
import { setupProductServiceMock } from '../../tests/productServiceMock.ts'

vi.mock('../../services/authService.ts')
vi.mock('../../services/productService.ts')
vi.mock('../../services/adminProductService.ts')

beforeEach(() => {
  setupAuthServiceMock()
  setupProductServiceMock()
  setupAdminProductServiceMock()
})

async function renderProductsPage(path = '/admin/products') {
  const result = renderAdminRoute(path)
  await screen.findByRole('table', { name: 'Produtos da API' })
  return result
}

describe('Listagem administrativa', () => {
  it('mostra carregamento e depois nome, categoria, preço, estoque e ações', async () => {
    const pendingPage = createDeferred<ProductPage>()
    vi.mocked(fetchProducts).mockImplementationOnce(() => pendingPage.promise)
    renderAdminRoute('/admin/products')

    expect(await screen.findByRole('status', { name: 'Carregando produtos' })).toBeInTheDocument()
    const { createProductPage, productFixtures } = await import('../../tests/fixtures/products.ts')
    pendingPage.resolve(createProductPage(productFixtures, { limit: 10, skip: 0 }))

    const row = await findProductRow('MacBook Pro 14')
    expect(within(row).getByText('Notebooks')).toBeInTheDocument()
    expect(within(row).getByText(/R\$\s1\.999,99/)).toBeInTheDocument()
    expect(within(row).getByText('9')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Editar MacBook Pro 14' })).toHaveAttribute(
      'href',
      '/admin/products/4/edit',
    )
    expect(within(row).getByRole('button', { name: 'Excluir MacBook Pro 14' })).toBeInTheDocument()
    expect(within(await findProductRow('Oppo A57')).getByText('Esgotado')).toBeInTheDocument()
    expect(screen.getByText('12 produtos na API · página 1 de 2')).toBeInTheDocument()
  })

  it('pagina com limit e skip', async () => {
    const { user, router } = await renderProductsPage()
    expect(getTableRows('Produtos da API')).toHaveLength(10)

    await user.click(screen.getByRole('button', { name: 'Página 2' }))

    expect(await screen.findByText('12 produtos na API · página 2 de 2')).toBeInTheDocument()
    expect(getTableRows('Produtos da API')).toHaveLength(2)
    expect(router.state.location.search).toBe('?page=2')
    expect(vi.mocked(fetchProducts)).toHaveBeenLastCalledWith({ limit: 10, skip: 10 }, expect.any(AbortSignal))
  })

  it('exibe estado vazio para página sem produtos', async () => {
    renderAdminRoute('/admin/products?page=5')

    expect(await screen.findByRole('heading', { name: 'Nenhum produto nesta página' })).toBeInTheDocument()
  })

  it('trata falha de rede com nova tentativa', async () => {
    vi.mocked(fetchProducts).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { user } = renderAdminRoute('/admin/products')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar os produtos')).toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('table', { name: 'Produtos da API' })).toBeInTheDocument()
  })
})

describe('Exclusão', () => {
  it('exclui após confirmação, remove a linha e notifica', async () => {
    const { user } = await renderProductsPage()

    await user.click(within(await findProductRow('Dell XPS 13')).getByRole('button', { name: 'Excluir Dell XPS 13' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir produto' })
    expect(within(dialog).getByText('Dell XPS 13')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(vi.mocked(deleteProduct)).toHaveBeenCalledWith(6)
    expect(screen.queryByText('Dell XPS 13')).not.toBeInTheDocument()
    expect(screen.getByText('“Dell XPS 13” foi excluído desta sessão.')).toBeInTheDocument()
    expect(screen.getByText(/1 excluído\(s\) nesta sessão/)).toBeInTheDocument()
  })

  it('cancelar a exclusão não chama a API e mantém o produto', async () => {
    const { user } = await renderProductsPage()

    await user.click(within(await findProductRow('Dell XPS 13')).getByRole('button', { name: 'Excluir Dell XPS 13' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vi.mocked(deleteProduct)).not.toHaveBeenCalled()
    expect(screen.getByText('Dell XPS 13')).toBeInTheDocument()
  })

  it('em caso de erro da API, notifica e mantém o produto e o modal', async () => {
    vi.mocked(deleteProduct).mockRejectedValueOnce(
      new ApiError('http', 'O servidor está indisponível no momento. Tente novamente mais tarde.', { status: 503 }),
    )
    const { user } = await renderProductsPage()

    await user.click(within(await findProductRow('Dell XPS 13')).getByRole('button', { name: 'Excluir Dell XPS 13' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('Não foi possível excluir o produto')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' })).toBeEnabled()
    expect(screen.getByRole('table', { name: 'Produtos da API' })).toHaveTextContent('Dell XPS 13')
  })

  it('exclusão de produto cadastrado nesta sessão não chama a API', async () => {
    const { user } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Temporário', description: 'D', category: 'Perfumes', price: '10', stock: '1' })
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    await user.click(within(await findProductRow('Temporário')).getByRole('button', { name: 'Excluir Temporário' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.queryByText('Temporário')).not.toBeInTheDocument())
    expect(vi.mocked(deleteProduct)).not.toHaveBeenCalled()
    expect(screen.queryByRole('table', { name: 'Produtos cadastrados nesta sessão' })).not.toBeInTheDocument()
  })

  it('excluir todos os itens da última página mostra estado vazio e mantém a navegação', async () => {
    const { user } = await renderProductsPage('/admin/products?page=2')
    await screen.findByText('12 produtos na API · página 2 de 2')

    for (const title of ['Vaso Cerâmico Decorativo', 'Relógio de Parede Minimalista']) {
      await user.click(within(await findProductRow(title)).getByRole('button', { name: `Excluir ${title}` }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }

    // A paginação segue a API (que não persiste exclusões); a contagem informa o que foi excluído.
    expect(screen.getByRole('heading', { name: 'Nenhum produto nesta página' })).toBeInTheDocument()
    expect(screen.getByText('12 produtos na API · página 2 de 2 · 2 excluído(s) nesta sessão')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página 1' }))
    expect(await findProductRow('iPhone 13 Pro')).toBeInTheDocument()
    expect(getTableRows('Produtos da API')).toHaveLength(10)
  })

  it('exclusão na primeira página mantém as demais linhas e a contagem consistente', async () => {
    const { user } = await renderProductsPage()

    await user.click(within(await findProductRow('iPhone 13 Pro')).getByRole('button', { name: 'Excluir iPhone 13 Pro' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(getTableRows('Produtos da API')).toHaveLength(9))
    expect(screen.getByText('12 produtos na API · página 1 de 2 · 1 excluído(s) nesta sessão')).toBeInTheDocument()
  })

  it('a exclusão continua aplicada após navegar e recarregar a listagem', async () => {
    const { user, router } = await renderProductsPage()
    await user.click(within(await findProductRow('Dell XPS 13')).getByRole('button', { name: 'Excluir Dell XPS 13' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(screen.queryByText('Dell XPS 13')).not.toBeInTheDocument())

    await router.navigate('/admin')
    await screen.findByText('1 excluído(s)')
    await router.navigate('/admin/products')

    // A API devolve o produto novamente (não persiste), mas a exclusão da sessão prevalece.
    await screen.findByRole('table', { name: 'Produtos da API' })
    expect(screen.queryByText('Dell XPS 13')).not.toBeInTheDocument()
  })
})

describe('Cadastro', () => {
  it('valida os campos obrigatórios com mensagens em português', async () => {
    const { user } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })

    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(screen.getByText('Informe o nome do produto.')).toBeInTheDocument()
    expect(screen.getByText('Informe a descrição do produto.')).toBeInTheDocument()
    expect(screen.getByText('Selecione uma categoria válida.')).toBeInTheDocument()
    expect(screen.getByText('Informe o preço.')).toBeInTheDocument()
    expect(screen.getByText('Informe o estoque.')).toBeInTheDocument()
    expect(vi.mocked(createProduct)).not.toHaveBeenCalled()
  })

  it('"Cancelar" volta para a listagem sem enviar nada', async () => {
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Descartado' })

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('table', { name: 'Produtos da API' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products')
    expect(vi.mocked(createProduct)).not.toHaveBeenCalled()
  })

  it('falha ao carregar categorias impede o formulário e permite tentar novamente', async () => {
    vi.mocked(fetchCategories).mockRejectedValueOnce(new ApiError('timeout', 'O servidor demorou demais para responder.'))
    const { user } = renderAdminRoute('/admin/products/new')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar as categorias')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cadastrar produto' })).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('button', { name: 'Cadastrar produto' })).toBeInTheDocument()
  })

  it('rejeita preço zero', async () => {
    const { user } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })

    await fillProductForm(user, { title: 'X', description: 'Y', category: 'Notebooks', price: '0', stock: '1' })
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(screen.getByText('O preço deve ser maior que zero.')).toBeInTheDocument()
    expect(vi.mocked(createProduct)).not.toHaveBeenCalled()
  })

  it('cadastra com números, volta à listagem e exibe o produto da sessão', async () => {
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })

    await fillProductForm(user, {
      title: '  Notebook Gamer  ',
      description: 'Notebook para jogos',
      category: 'Notebooks',
      price: '1299,9',
      stock: '7',
    })
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(await screen.findByRole('table', { name: 'Produtos cadastrados nesta sessão' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products')
    expect(vi.mocked(createProduct)).toHaveBeenCalledWith({
      title: 'Notebook Gamer',
      description: 'Notebook para jogos',
      category: 'laptops',
      price: 1299.9,
      stock: 7,
    })
    const row = await findProductRow('Notebook Gamer')
    expect(within(row).getByText('Novo (local)')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: 'Editar Notebook Gamer' })).toHaveAttribute(
      'href',
      '/admin/products/local-1/edit',
    )
    expect(screen.getByText('“Notebook Gamer” foi cadastrado nesta sessão.')).toBeInTheDocument()
  })

  it('evita submissão duplicada enquanto a requisição está pendente', async () => {
    const pending = createDeferred<{ id: number; product: Parameters<typeof createProduct>[0] }>()
    vi.mocked(createProduct).mockImplementationOnce(() => pending.promise)
    const { user } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Único', description: 'D', category: 'Perfumes', price: '10', stock: '1' })

    const submit = screen.getByRole('button', { name: 'Cadastrar produto' })
    await user.click(submit)
    await user.click(submit)
    await user.dblClick(submit)

    expect(vi.mocked(createProduct)).toHaveBeenCalledTimes(1)
    expect(submit).toHaveAttribute('data-loading', 'true')
    expect(screen.getByRole('textbox', { name: 'Nome do produto' })).toBeDisabled()

    pending.resolve({ id: 195, product: { title: 'Único', description: 'D', category: 'fragrances', price: 10, stock: 1 } })
    expect(await screen.findByRole('table', { name: 'Produtos cadastrados nesta sessão' })).toBeInTheDocument()
    expect(getTableRows('Produtos cadastrados nesta sessão')).toHaveLength(1)
  })

  it('em caso de erro da API, notifica e reabilita o formulário com os dados', async () => {
    vi.mocked(createProduct).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Falha', description: 'D', category: 'Perfumes', price: '10', stock: '1' })

    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(await screen.findByText('Não foi possível cadastrar o produto')).toBeInTheDocument()
    expect(screen.getByText(/Verifique sua conexão/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products/new')
    expect(screen.getByRole('button', { name: 'Cadastrar produto' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Falha')
  })

  it('informa resposta inválida da API', async () => {
    vi.mocked(createProduct).mockRejectedValueOnce(
      new ApiError('validation', 'Os dados recebidos do servidor estão em um formato inesperado.'),
    )
    const { user } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'X', description: 'D', category: 'Perfumes', price: '10', stock: '1' })

    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(await screen.findByText(/formato inesperado/)).toBeInTheDocument()
  })

  it('produtos cadastrados com o mesmo id da API recebem identidades locais distintas', async () => {
    const { user } = renderAdminRoute('/admin/products/new')

    for (const [index, title] of ['Primeiro', 'Segundo'].entries()) {
      // A partir do segundo produto, o formulário é aberto pela listagem, como faria o usuário.
      if (index > 0) await user.click(screen.getByRole('link', { name: 'Novo produto' }))
      await screen.findByRole('textbox', { name: 'Nome do produto' })
      await fillProductForm(user, { title, description: 'D', category: 'Perfumes', price: '10', stock: '1' })
      await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))
      await findProductRow(title)
    }

    expect(within(await findProductRow('Segundo')).getByRole('link', { name: 'Editar Segundo' })).toHaveAttribute(
      'href',
      '/admin/products/local-2/edit',
    )
    expect(within(await findProductRow('Primeiro')).getByRole('link', { name: 'Editar Primeiro' })).toHaveAttribute(
      'href',
      '/admin/products/local-1/edit',
    )
  })
})

describe('Edição', () => {
  it('carrega o produto, envia PUT e mostra a alteração na listagem', async () => {
    const { user, router } = renderAdminRoute('/admin/products/4/edit')

    const titleInput = await screen.findByRole('textbox', { name: 'Nome do produto' })
    expect(titleInput).toHaveValue('MacBook Pro 14')
    expect(screen.getByRole('textbox', { name: 'Estoque' })).toHaveValue('9')

    await fillProductForm(user, { title: 'MacBook Pro 14 (2026)', stock: '15' })
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('table', { name: 'Produtos da API' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products')
    expect(vi.mocked(updateProduct)).toHaveBeenCalledWith(4, {
      title: 'MacBook Pro 14 (2026)',
      description: 'Notebook com chip M2 Pro, tela Liquid Retina XDR e até 18 horas de bateria.',
      category: 'laptops',
      price: 1999.99,
      stock: 15,
    })
    const row = await findProductRow('MacBook Pro 14 (2026)')
    expect(within(row).getByText('Editado')).toBeInTheDocument()
    expect(within(row).getByText('15')).toBeInTheDocument()
  })

  it('a edição continua visível após navegar pelo painel', async () => {
    const { user, router } = renderAdminRoute('/admin/products/4/edit')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'MacBook persistente' })
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await findProductRow('MacBook persistente')

    await router.navigate('/admin')
    expect(await screen.findByText('1 editado(s)')).toBeInTheDocument()
    await router.navigate('/products')
    await router.navigate('/admin/products')

    expect(within(await findProductRow('MacBook persistente')).getByText('Editado')).toBeInTheDocument()
    expect(screen.queryByText('MacBook Pro 14')).not.toBeInTheDocument()
  })

  it('falha ao salvar notifica, mantém a página e reabilita o formulário', async () => {
    vi.mocked(updateProduct).mockRejectedValueOnce(
      new ApiError('http', 'O servidor está indisponível no momento. Tente novamente mais tarde.', { status: 500 }),
    )
    const { user, router } = renderAdminRoute('/admin/products/4/edit')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Não salvo' })

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByText('Não foi possível salvar as alterações')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products/4/edit')
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Não salvo')
  })

  it('erro ao carregar o produto oferece nova tentativa', async () => {
    vi.mocked(fetchProductById).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { user } = renderAdminRoute('/admin/products/4/edit')

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar o produto')).toBeInTheDocument()
    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByRole('textbox', { name: 'Nome do produto' })).toHaveValue('MacBook Pro 14')
  })

  it('produto excluído nesta sessão não pode ser editado', async () => {
    const { user, router } = await renderProductsPage()
    await user.click(within(await findProductRow('Dell XPS 13')).getByRole('button', { name: 'Excluir Dell XPS 13' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await router.navigate('/admin/products/6/edit')

    expect(await screen.findByRole('heading', { name: 'Produto excluído' })).toBeInTheDocument()
  })

  it('reabrir a edição mostra os dados já alterados nesta sessão', async () => {
    const { user, router } = renderAdminRoute('/admin/products/4/edit')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Editado uma vez' })
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await findProductRow('Editado uma vez')

    await router.navigate('/admin/products/4/edit')

    expect(await screen.findByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Editado uma vez')
  })

  it('edita produto cadastrado nesta sessão sem chamar a API', async () => {
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Local', description: 'D', category: 'Perfumes', price: '10', stock: '1' })
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))
    await findProductRow('Local')

    await router.navigate('/admin/products/local-1/edit')
    expect(await screen.findByText(/A edição é aplicada apenas localmente/)).toBeInTheDocument()
    // O aviso aparece antes do formulário (que aguarda as categorias): esperar pelo campo.
    expect(await screen.findByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Local')
    await fillProductForm(user, { title: 'Local editado' })
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await findProductRow('Local editado')).toBeInTheDocument()
    expect(vi.mocked(updateProduct)).not.toHaveBeenCalled()
  })

  it.each([
    ['/admin/products/999/edit', 'Produto não encontrado'],
    ['/admin/products/local-9/edit', 'Produto não encontrado'],
    ['/admin/products/abc/edit', 'Endereço inválido'],
  ])('trata %s', async (path, heading) => {
    renderAdminRoute(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para a listagem' })).toHaveAttribute('href', '/admin/products')
  })
})
