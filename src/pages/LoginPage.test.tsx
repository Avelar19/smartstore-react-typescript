import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUser } from '../schemas/auth.ts'
import { ApiError } from '../services/apiError.ts'
import type { LoginResult } from '../services/authService.ts'
import { fetchCurrentUser, login } from '../services/authService.ts'
import { setupAuthServiceMock } from '../tests/authServiceMock.ts'
import { createDeferred } from '../tests/deferred.ts'
import {
  authUserFixture,
  createTestToken,
  DEMO_PASSWORD,
  DEMO_USERNAME,
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

async function renderLogin(entry: Parameters<typeof renderRoute>[0] = '/login') {
  const result = renderRoute(entry)
  await screen.findByRole('heading', { level: 1, name: 'Entrar' })
  return result
}

function getUsernameInput() {
  return screen.getByRole('textbox', { name: 'Usuário' })
}

function getPasswordInput() {
  return screen.getByLabelText('Senha')
}

describe('LoginPage', () => {
  it('valida os campos obrigatórios com Zod sem chamar a API', async () => {
    const { user } = await renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe o usuário.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(vi.mocked(login)).not.toHaveBeenCalled()
  })

  it('considera vazio um usuário com apenas espaços', async () => {
    const { user } = await renderLogin()

    await user.type(getUsernameInput(), '   ')
    await user.type(getPasswordInput(), 'qualquer')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe o usuário.')).toBeInTheDocument()
    expect(vi.mocked(login)).not.toHaveBeenCalled()
  })

  it('faz login, notifica e redireciona para o painel', async () => {
    const { user, router } = await renderLogin()

    await user.type(getUsernameInput(), ` ${DEMO_USERNAME} `)
    await user.type(getPasswordInput(), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
    expect(vi.mocked(login)).toHaveBeenCalledWith({ username: DEMO_USERNAME, password: DEMO_PASSWORD })
    expect(screen.getByText('Login realizado com sucesso.')).toBeInTheDocument()
  })

  it('exibe carregamento e bloqueia o formulário durante a autenticação', async () => {
    const pendingLogin = createDeferred<LoginResult>()
    vi.mocked(login).mockImplementationOnce(() => pendingLogin.promise)
    const { user } = await renderLogin()

    await user.type(getUsernameInput(), DEMO_USERNAME)
    await user.type(getPasswordInput(), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('data-loading', 'true')
    expect(getUsernameInput()).toBeDisabled()
    expect(getPasswordInput()).toBeDisabled()

    pendingLogin.resolve({ accessToken: createTestToken(), user: authUserFixture })
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeInTheDocument()
  })

  it('informa credenciais inválidas e permanece no login', async () => {
    const { user, router } = await renderLogin()

    await user.type(getUsernameInput(), DEMO_USERNAME)
    await user.type(getPasswordInput(), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Usuário ou senha inválidos.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('informa falha de conexão', async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { user } = await renderLogin()

    await user.type(getUsernameInput(), DEMO_USERNAME)
    await user.type(getPasswordInput(), DEMO_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/Verifique sua conexão/)).toBeInTheDocument()
  })

  it('limpa a mensagem de erro ao sair da página', async () => {
    const { user, router } = await renderLogin()
    await user.type(getUsernameInput(), DEMO_USERNAME)
    await user.type(getPasswordInput(), 'senha-errada')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByText('Usuário ou senha inválidos.')

    await user.click(screen.getByRole('link', { name: 'SmartStore' }))
    await router.navigate('/login')

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText('Usuário ou senha inválidos.')).not.toBeInTheDocument()
  })

  it('exibe orientação discreta com as credenciais públicas de demonstração', async () => {
    await renderLogin()

    expect(screen.getByText(/usuário público da DummyJSON/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'documentação oficial' })).toHaveAttribute(
      'href',
      'https://dummyjson.com/docs/auth',
    )
  })

  it('redireciona usuário já autenticado que acessa /login', async () => {
    storeSessionToken(createTestToken())
    const { router } = renderRoute('/login')

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin')
  })

  it('mostra carregamento enquanto a sessão salva é validada', async () => {
    storeSessionToken(createTestToken())
    const restore = createDeferred<AuthUser>()
    vi.mocked(fetchCurrentUser).mockImplementationOnce(() => restore.promise)
    renderRoute('/login')

    expect(await screen.findByText('Validando sua sessão…')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Usuário' })).not.toBeInTheDocument()

    restore.resolve(authUserFixture)
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeInTheDocument()
  })
})
