import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '../schemas/auth.ts'
import { ApiError } from '../services/apiError.ts'
import { fetchCurrentUser } from '../services/authService.ts'
import { fetchCatalogPage } from '../services/productService.ts'
import { setupAuthServiceMock } from '../tests/authServiceMock.ts'
import { createDeferred } from '../tests/deferred.ts'
import {
  authUserFixture,
  createTestToken,
  DEMO_PASSWORD,
  DEMO_USERNAME,
  getStoredToken,
  storeSessionToken,
} from '../tests/fixtures/auth.ts'
import { setupProductServiceMock } from '../tests/productServiceMock.ts'
import { renderRoute } from '../tests/test-utils.tsx'

vi.mock('../services/authService.ts')
vi.mock('../services/productService.ts')

beforeEach(() => {
  setupAuthServiceMock()
  setupProductServiceMock()
})

function getHeader() {
  return screen.getByRole('banner')
}

describe('ProtectedRoute e fluxo de autenticação', () => {
  it('redireciona usuário não autenticado de /admin para /login preservando a origem', async () => {
    const { router } = renderRoute('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state).toMatchObject({ from: { pathname: '/admin' } })
    expect(screen.getByText('Faça login para acessar a área administrativa.')).toBeInTheDocument()
  })

  it('após o login, retorna à rota originalmente solicitada', async () => {
    const { user, router } = renderRoute({ pathname: '/admin', search: '?origem=teste' })
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })

    await user.type(screen.getByRole('textbox', { name: 'Usuário' }), DEMO_USERNAME)
    await user.type(screen.getByLabelText('Senha'), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
    expect(router.state.location.search).toBe('?origem=teste')
    expect(screen.getByText('Olá, Emily! Você está autenticado na SmartStore.')).toBeInTheDocument()
  })

  it('mostra carregamento durante a validação da sessão e depois libera o painel', async () => {
    storeSessionToken(createTestToken())
    const restore = createDeferred<AuthUser>()
    vi.mocked(fetchCurrentUser).mockImplementationOnce(() => restore.promise)
    renderRoute('/admin')

    expect(await screen.findByText('Validando sua sessão…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Painel administrativo' })).not.toBeInTheDocument()

    restore.resolve(authUserFixture)

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeInTheDocument()
    expect(screen.getByText('emily.johnson@x.dummyjson.com')).toBeInTheDocument()
  })

  it('com token inválido ou expirado no acesso direto, limpa a sessão e pede login', async () => {
    storeSessionToken(createTestToken())
    vi.mocked(fetchCurrentUser).mockRejectedValueOnce(new ApiError('http', 'Erro', { status: 401 }))
    const { router } = renderRoute('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(getStoredToken()).toBeNull()
  })

  it('exibe identificação do usuário e ações de sessão no cabeçalho', async () => {
    storeSessionToken(createTestToken())
    renderRoute('/')

    const header = getHeader()
    expect(await within(header).findByLabelText('Usuário autenticado: Emily Johnson')).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Painel administrativo' })).toHaveAttribute('href', '/admin')
    expect(within(header).getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('logout leva à Home, oculta o painel e impede novo acesso a /admin', async () => {
    storeSessionToken(createTestToken())
    const { user, router } = renderRoute('/admin')
    await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })

    await user.click(within(getHeader()).getByRole('button', { name: 'Sair' }))

    expect(router.state.location.pathname).toBe('/')
    expect(await screen.findByText('Você saiu da sua conta.')).toBeInTheDocument()
    expect(within(getHeader()).getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(getStoredToken()).toBeNull()

    await router.navigate('/admin')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('logout em página pública mantém o usuário na mesma página', async () => {
    storeSessionToken(createTestToken())
    const { user, router } = renderRoute('/products?category=laptops')
    await within(getHeader()).findByLabelText('Usuário autenticado: Emily Johnson')

    await user.click(within(getHeader()).getByRole('button', { name: 'Sair' }))

    expect(router.state.location.pathname).toBe('/products')
    expect(router.state.location.search).toBe('?category=laptops')
    expect(within(getHeader()).getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(getStoredToken()).toBeNull()
  })

  it('mantém o catálogo público funcionando após o logout', async () => {
    storeSessionToken(createTestToken())
    const { user } = renderRoute('/admin')
    await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })
    await user.click(within(getHeader()).getByRole('button', { name: 'Sair' }))

    await user.click(within(getHeader()).getByRole('link', { name: 'Catálogo' }))

    expect(await screen.findByText(/12 produtos encontrados/)).toBeInTheDocument()
    expect(vi.mocked(fetchCatalogPage)).toHaveBeenCalled()
  })

  it('menu móvel mostra "Entrar" sem sessão e "Sair" com sessão', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const anonymousMenu = screen.getByRole('navigation', { name: 'Menu móvel' })
    expect(within(anonymousMenu).getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(within(anonymousMenu).queryByRole('link', { name: 'Painel administrativo' })).not.toBeInTheDocument()
  })

  it('menu móvel autenticado oferece painel e logout', async () => {
    storeSessionToken(createTestToken())
    const { user, router } = renderRoute('/')
    await within(getHeader()).findByLabelText('Usuário autenticado: Emily Johnson')

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const mobileMenu = screen.getByRole('navigation', { name: 'Menu móvel' })
    expect(within(mobileMenu).getByRole('link', { name: 'Painel administrativo' })).toBeInTheDocument()

    const logoutButtons = screen.getAllByRole('button', { name: 'Sair' })
    const mobileLogout = logoutButtons.at(-1)
    if (!mobileLogout) throw new Error('Botão Sair do menu móvel não encontrado.')
    await user.click(mobileLogout)

    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('navigation', { name: 'Menu móvel' })).not.toBeInTheDocument()
    expect(getStoredToken()).toBeNull()
  })
})
