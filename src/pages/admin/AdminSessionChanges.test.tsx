import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WriteResult } from '../../services/adminProductService.ts'
import { createProduct } from '../../services/adminProductService.ts'
import { setupAdminProductServiceMock } from '../../tests/adminProductServiceMock.ts'
import { fillProductForm, findProductRow, renderAdminRoute } from '../../tests/adminTestUtils.ts'
import { setupAuthServiceMock } from '../../tests/authServiceMock.ts'
import { createDeferred } from '../../tests/deferred.ts'
import { DEMO_PASSWORD, DEMO_USERNAME } from '../../tests/fixtures/auth.ts'
import { setupProductServiceMock } from '../../tests/productServiceMock.ts'

vi.mock('../../services/authService.ts')
vi.mock('../../services/productService.ts')
vi.mock('../../services/adminProductService.ts')

beforeEach(() => {
  setupAuthServiceMock()
  setupProductServiceMock()
  setupAdminProductServiceMock()
})

function getHeader() {
  return screen.getByRole('banner')
}

async function loginThroughForm(user: ReturnType<typeof renderAdminRoute>['user']) {
  await user.type(await screen.findByRole('textbox', { name: 'Usuário' }), DEMO_USERNAME)
  await user.type(screen.getByLabelText('Senha'), DEMO_PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Isolamento das alterações simuladas entre sessões', () => {
  it('resposta atrasada de um cadastro feito antes do logout não é aplicada à sessão seguinte', async () => {
    const pendingCreate = createDeferred<WriteResult>()
    vi.mocked(createProduct).mockImplementationOnce(() => pendingCreate.promise)
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Atrasado', description: 'D', category: 'Perfumes', price: '10', stock: '1' })
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    // Logout com a requisição pendente e novo login.
    await user.click(within(getHeader()).getByRole('button', { name: 'Sair' }))
    await screen.findByText('Você saiu da sua conta.')
    await router.navigate('/login')
    await loginThroughForm(user)
    await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })

    // A resposta da sessão anterior chega agora.
    pendingCreate.resolve({ id: 195, product: { title: 'Atrasado', description: 'D', category: 'fragrances', price: 10, stock: 1 } })
    await pendingCreate.promise

    expect(router.state.location.pathname).toBe('/admin')
    expect(screen.queryByText('“Atrasado” foi cadastrado nesta sessão.')).not.toBeInTheDocument()
    expect(await screen.findByText('0 cadastrado(s)')).toBeInTheDocument()
  })

  it('logout limpa as alterações simuladas: o novo login começa com os dados da API', async () => {
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'Da sessão anterior', description: 'D', category: 'Perfumes', price: '10', stock: '1' })
    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))
    await findProductRow('Da sessão anterior')
    await user.click(within(await findProductRow('Dell XPS 13')).getByRole('button', { name: 'Excluir Dell XPS 13' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(screen.queryByText('Dell XPS 13')).not.toBeInTheDocument())

    await router.navigate('/admin')
    expect(await screen.findByText('1 cadastrado(s)')).toBeInTheDocument()
    expect(screen.getByText('1 excluído(s)')).toBeInTheDocument()

    await user.click(within(getHeader()).getByRole('button', { name: 'Sair' }))
    await screen.findByText('Você saiu da sua conta.')
    await router.navigate('/login')
    await loginThroughForm(user)

    expect(await screen.findByText('0 cadastrado(s)')).toBeInTheDocument()
    expect(screen.getByText('0 excluído(s)')).toBeInTheDocument()
    await router.navigate('/admin/products')
    expect(await findProductRow('Dell XPS 13')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Produtos cadastrados nesta sessão' })).not.toBeInTheDocument()
  })
})
