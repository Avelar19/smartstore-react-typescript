import { act, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../hooks/useAuth.ts'
import type { AuthUser } from '../schemas/auth.ts'
import { api } from '../services/api.ts'
import { ApiError } from '../services/apiError.ts'
import { SESSION_EXPIRED_MESSAGE } from '../services/authErrors.ts'
import type { LoginResult } from '../services/authService.ts'
import { fetchCurrentUser, login } from '../services/authService.ts'
import { setupAuthServiceMock } from '../tests/authServiceMock.ts'
import { httpError, mockApiAdapter, restoreApiAdapter } from '../tests/axiosMock.ts'
import { createDeferred } from '../tests/deferred.ts'
import {
  authUserFixture,
  createTestToken,
  DEMO_PASSWORD,
  DEMO_USERNAME,
  getStoredToken,
  storeSessionToken,
} from '../tests/fixtures/auth.ts'
import { TestProviders } from '../tests/test-utils.tsx'

vi.mock('../services/authService.ts')

const demoCredentials = { username: DEMO_USERNAME, password: DEMO_PASSWORD }
const otherUser: AuthUser = { ...authUserFixture, id: 2, username: 'michaelw', firstName: 'Michael' }

beforeEach(() => {
  setupAuthServiceMock()
})

afterEach(() => {
  restoreApiAdapter()
})

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: TestProviders })
}

function storageContains(text: string): boolean {
  const values = [sessionStorage, localStorage].flatMap((storage) =>
    Object.keys(storage).map((key) => storage.getItem(key) ?? ''),
  )
  return values.some((value) => value.includes(text))
}

describe('AuthProvider — inicialização e restauração', () => {
  it('sem token salvo, inicia sem sessão e sem consultar a API', () => {
    const { result } = renderAuth()

    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.user).toBeNull()
    expect(vi.mocked(fetchCurrentUser)).not.toHaveBeenCalled()
  })

  it('restaura a sessão validando o token salvo em GET /auth/me', async () => {
    const token = createTestToken()
    storeSessionToken(token)

    const { result } = renderAuth()

    // A área restrita não é liberada antes da confirmação do servidor.
    expect(result.current.status).toBe('restoring')
    expect(result.current.isAuthenticated).toBe(false)

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user).toEqual(authUserFixture)
    expect(vi.mocked(fetchCurrentUser)).toHaveBeenCalledWith(token, expect.any(AbortSignal))
  })

  it('limpa a sessão quando o servidor recusa o token (inválido ou expirado)', async () => {
    storeSessionToken(createTestToken())
    vi.mocked(fetchCurrentUser).mockRejectedValue(
      new ApiError('http', 'Erro', { status: 500, serverMessage: 'invalid token' }),
    )

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
    expect(getStoredToken()).toBeNull()
    expect(await screen.findByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument()
  })

  it('descarta token já expirado (claim exp) sem consultar a API', async () => {
    storeSessionToken(createTestToken(-60))

    const { result } = renderAuth()

    expect(result.current.status).toBe('unauthenticated')
    expect(vi.mocked(fetchCurrentUser)).not.toHaveBeenCalled()
    await waitFor(() => expect(getStoredToken()).toBeNull())
  })
})

describe('AuthProvider — login e logout', () => {
  it('autentica, persiste somente o accessToken e nunca a senha', async () => {
    const { result } = renderAuth()

    let success = false
    await act(async () => {
      success = await result.current.login(demoCredentials)
    })

    expect(success).toBe(true)
    expect(result.current.status).toBe('authenticated')
    expect(result.current.user?.firstName).toBe('Emily')
    expect(getStoredToken()).not.toBeNull()
    expect(storageContains(DEMO_PASSWORD)).toBe(false)
  })

  it('informa credenciais inválidas sem iniciar sessão', async () => {
    const { result } = renderAuth()

    let success = true
    await act(async () => {
      success = await result.current.login({ username: DEMO_USERNAME, password: 'senha-errada' })
    })

    expect(success).toBe(false)
    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.error).toBe('Usuário ou senha inválidos.')
    expect(getStoredToken()).toBeNull()

    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })

  it('informa falha de conexão no login', async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'),
    )
    const { result } = renderAuth()

    await act(async () => {
      await result.current.login(demoCredentials)
    })

    expect(result.current.error).toMatch(/Não foi possível conectar/)
  })

  it('logout encerra a sessão e remove o token', async () => {
    const { result } = renderAuth()
    await act(async () => {
      await result.current.login(demoCredentials)
    })

    act(() => result.current.logout())

    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.user).toBeNull()
    expect(getStoredToken()).toBeNull()
  })

  it('mantém o mesmo valor de contexto quando a sessão não muda (evita renderizações)', () => {
    const { result, rerender } = renderAuth()
    const firstValue = result.current

    rerender()

    expect(result.current).toBe(firstValue)
  })
})

describe('AuthProvider — expiração e HTTP 401', () => {
  it('encerra a sessão uma única vez quando requisições autenticadas recebem 401', async () => {
    const { result } = renderAuth()
    await act(async () => {
      await result.current.login(demoCredentials)
    })
    mockApiAdapter((config) => {
      throw httpError(config, 401, { message: 'Token Expired!' })
    })

    // Duas requisições simultâneas falham com 401.
    await act(async () => {
      await Promise.allSettled([api.get('/auth/me'), api.get('/auth/me')])
    })

    expect(result.current.status).toBe('unauthenticated')
    expect(getStoredToken()).toBeNull()
    expect(await screen.findAllByText(SESSION_EXPIRED_MESSAGE)).toHaveLength(1)
  })

  it('encerra a sessão automaticamente quando o token expira (fake timers)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.mocked(login).mockResolvedValueOnce({ accessToken: createTestToken(60), user: authUserFixture })
    const { result } = renderAuth()
    await act(async () => {
      await result.current.login(demoCredentials)
    })

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(result.current.status).toBe('authenticated')

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current.status).toBe('unauthenticated')
    expect(getStoredToken()).toBeNull()
  })

  it('não agenda encerramento para expiração além do limite do setTimeout (~24,8 dias)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const thirtyDays = 30 * 24 * 60 * 60
    vi.mocked(login).mockResolvedValueOnce({ accessToken: createTestToken(thirtyDays), user: authUserFixture })
    const { result } = renderAuth()
    await act(async () => {
      await result.current.login(demoCredentials)
    })

    // Sem a proteção, o atraso estouraria o limite e o timer dispararia imediatamente.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(result.current.status).toBe('authenticated')
  })
})

describe('AuthProvider — requisições concorrentes', () => {
  it('login durante a restauração prevalece sobre a resposta tardia de /auth/me', async () => {
    storeSessionToken(createTestToken())
    const restore = createDeferred<AuthUser>()
    vi.mocked(fetchCurrentUser).mockImplementationOnce(() => restore.promise)
    const { result } = renderAuth()
    expect(result.current.status).toBe('restoring')

    await act(async () => {
      await result.current.login(demoCredentials)
    })
    await act(async () => {
      restore.resolve(otherUser)
      await restore.promise
    })

    expect(result.current.user?.username).toBe('emilys')
  })

  it('logout durante um login pendente impede que a sessão seja iniciada', async () => {
    const pendingLogin = createDeferred<LoginResult>()
    vi.mocked(login).mockImplementationOnce(() => pendingLogin.promise)
    const { result } = renderAuth()

    let loginPromise: Promise<boolean> = Promise.resolve(false)
    act(() => {
      loginPromise = result.current.login(demoCredentials)
    })
    act(() => result.current.logout())

    let success = true
    await act(async () => {
      pendingLogin.resolve({ accessToken: createTestToken(), user: authUserFixture })
      success = await loginPromise
    })

    expect(success).toBe(false)
    expect(result.current.status).toBe('unauthenticated')
    expect(getStoredToken()).toBeNull()
  })

  it('falha de um login já substituído (logout) não exibe mensagem de erro', async () => {
    const pendingLogin = createDeferred<LoginResult>()
    vi.mocked(login).mockImplementationOnce(() => pendingLogin.promise)
    const { result } = renderAuth()

    let loginPromise: Promise<boolean> = Promise.resolve(true)
    act(() => {
      loginPromise = result.current.login(demoCredentials)
    })
    act(() => result.current.logout())

    let success = true
    await act(async () => {
      pendingLogin.reject(new ApiError('network', 'Sem conexão'))
      success = await loginPromise
    })

    expect(success).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe('unauthenticated')
  })

  it('com dois logins simultâneos, vale o mais recente', async () => {
    const firstLogin = createDeferred<LoginResult>()
    const secondToken = createTestToken(3600, 'michaelw')
    vi.mocked(login)
      .mockImplementationOnce(() => firstLogin.promise)
      .mockResolvedValueOnce({ accessToken: secondToken, user: otherUser })
    const { result } = renderAuth()

    let firstPromise: Promise<boolean> = Promise.resolve(false)
    act(() => {
      firstPromise = result.current.login(demoCredentials)
    })
    await act(async () => {
      await result.current.login({ username: 'michaelw', password: 'michaelwpass' })
    })
    await act(async () => {
      firstLogin.resolve({ accessToken: createTestToken(), user: authUserFixture })
      await firstPromise
    })

    expect(result.current.user?.username).toBe('michaelw')
    expect(getStoredToken()).toBe(secondToken)
  })
})
