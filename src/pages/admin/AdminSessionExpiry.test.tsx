import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SESSION_EXPIRED_MESSAGE } from '../../services/authErrors.ts'
import { fillProductForm, renderAdminRoute } from '../../tests/adminTestUtils.ts'
import { setupAuthServiceMock } from '../../tests/authServiceMock.ts'
import { httpError, mockApiAdapter, restoreApiAdapter } from '../../tests/axiosMock.ts'
import { getStoredToken } from '../../tests/fixtures/auth.ts'
import { setupProductServiceMock } from '../../tests/productServiceMock.ts'

// O adminProductService NÃO é mockado: a requisição passa pelo Axios e pelos interceptors reais.
vi.mock('../../services/authService.ts')
vi.mock('../../services/productService.ts')

beforeEach(() => {
  setupAuthServiceMock()
  setupProductServiceMock()
})

afterEach(() => {
  restoreApiAdapter()
})

describe('Sessão expirada durante o CRUD', () => {
  it('um 401 na escrita encerra a sessão, pede login e notifica uma única vez', async () => {
    const adapter = mockApiAdapter((config) => {
      throw httpError(config, 401, { message: 'Token Expired!' })
    })
    const { user, router } = renderAdminRoute('/admin/products/new')
    await screen.findByRole('textbox', { name: 'Nome do produto' })
    await fillProductForm(user, { title: 'X', description: 'D', category: 'Perfumes', price: '10', stock: '1' })

    await user.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.state).toMatchObject({ from: { pathname: '/admin/products/new' } })
    expect(adapter.mock.lastCall?.[0].url).toBe('/products/add')
    expect(getStoredToken()).toBeNull()
    expect(screen.getAllByText(SESSION_EXPIRED_MESSAGE)).toHaveLength(1)
    // A falha da operação não gera uma segunda notificação de erro.
    expect(screen.queryByText('Não foi possível cadastrar o produto')).not.toBeInTheDocument()
  })
})
