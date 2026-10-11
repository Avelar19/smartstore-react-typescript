import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchCatalogStats, fetchCategories } from '../../services/productService.ts'
import type { CatalogStatsResponse } from '../../schemas/product.ts'
import { ApiError } from '../../services/apiError.ts'
import { setupAdminProductServiceMock } from '../../tests/adminProductServiceMock.ts'
import { renderAdminRoute } from '../../tests/adminTestUtils.ts'
import { createDeferred } from '../../tests/deferred.ts'
import { setupAuthServiceMock } from '../../tests/authServiceMock.ts'
import { DEMO_PASSWORD, DEMO_USERNAME } from '../../tests/fixtures/auth.ts'
import { setupProductServiceMock } from '../../tests/productServiceMock.ts'
import { renderRoute } from '../../tests/test-utils.tsx'

vi.mock('../../services/authService.ts')
vi.mock('../../services/productService.ts')
vi.mock('../../services/adminProductService.ts')

beforeEach(() => {
  setupAuthServiceMock()
  setupProductServiceMock()
  setupAdminProductServiceMock()
})

describe('Rotas administrativas', () => {
  it.each(['/admin', '/admin/products', '/admin/products/new', '/admin/products/1/edit', '/admin/products/local-1/edit'])(
    'protege %s e redireciona para o login preservando a origem',
    async (path) => {
      const { router } = renderRoute(path)

      expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
      expect(router.state.location.state).toMatchObject({ from: { pathname: path } })
    },
  )

  it('após o login, volta para a rota administrativa solicitada', async () => {
    const { user, router } = renderRoute('/admin/products/new')
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })

    await user.type(screen.getByRole('textbox', { name: 'Usuário' }), DEMO_USERNAME)
    await user.type(screen.getByLabelText('Senha'), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Novo produto' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products/new')
  })

  it('layout compartilhado: navegação administrativa e aviso de simulação', async () => {
    const { user, router } = renderAdminRoute('/admin')
    await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })

    const adminNav = screen.getByRole('navigation', { name: 'Navegação administrativa' })
    expect(within(adminNav).getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Modo demonstração')).toBeInTheDocument()
    expect(screen.getByText('não persiste nenhuma alteração')).toBeInTheDocument()

    await user.click(within(adminNav).getByRole('link', { name: 'Produtos' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Produtos' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products')
    expect(within(adminNav).getByRole('link', { name: 'Produtos' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('Dashboard', () => {
  it('exibe usuário, indicadores reais do catálogo e atalhos', async () => {
    renderAdminRoute('/admin')

    expect(await screen.findByText('Olá, Emily! Você está autenticado na SmartStore.')).toBeInTheDocument()
    expect(screen.getByText('emily.johnson@x.dummyjson.com')).toBeInTheDocument()

    // Fixtures: 12 produtos, 4 categorias, 1 esgotado, 313 unidades.
    expect(await screen.findByText('Produtos na API')).toBeInTheDocument()
    const statValue = (label: string) => screen.getByText(label).nextElementSibling?.textContent
    expect(statValue('Produtos na API')).toBe('12')
    expect(statValue('Categorias')).toBe('4')
    expect(statValue('Produtos esgotados')).toBe('1')
    expect(statValue('Unidades em estoque')).toBe('313')
    expect(screen.getByText(/calculados sobre 12 de 12 produtos/)).toBeInTheDocument()
    expect(vi.mocked(fetchCatalogStats)).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('link', { name: 'Gerenciar produtos' })).toHaveAttribute('href', '/admin/products')
    expect(screen.getByRole('link', { name: 'Novo produto' })).toHaveAttribute('href', '/admin/products/new')
  })

  it('mostra carregamento e trata falha com nova tentativa', async () => {
    const pendingStats = createDeferred<CatalogStatsResponse>()
    vi.mocked(fetchCatalogStats).mockImplementationOnce(() => pendingStats.promise)
    const { user } = renderAdminRoute('/admin')

    expect(await screen.findByRole('status', { name: 'Carregando indicadores' })).toBeInTheDocument()
    pendingStats.reject(new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão.'))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar os indicadores')).toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Produtos na API')).toBeInTheDocument()
  })

  it('falha nas categorias também é tratada e recuperada', async () => {
    vi.mocked(fetchCategories).mockRejectedValueOnce(new ApiError('http', 'Erro 500', { status: 500 }))
    const { user } = renderAdminRoute('/admin')

    const alert = await screen.findByRole('alert')
    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Produtos na API')).toBeInTheDocument()
    expect(vi.mocked(fetchCategories)).toHaveBeenCalledTimes(2)
  })
})
