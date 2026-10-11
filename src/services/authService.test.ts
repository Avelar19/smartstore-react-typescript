import { afterEach, describe, expect, it, vi } from 'vitest'

import { authUserFixture, createTestToken } from '../tests/fixtures/auth.ts'
import { httpError, jsonResponse, mockApiAdapter, networkError, restoreApiAdapter } from '../tests/axiosMock.ts'
import { setUnauthorizedHandler } from './api.ts'
import { ApiError } from './apiError.ts'
import { getLoginErrorMessage } from './authErrors.ts'
import { fetchCurrentUser, login, SESSION_DURATION_MINUTES } from './authService.ts'
import { ACCESS_TOKEN_STORAGE_KEY } from './tokenStorage.ts'

const signal = new AbortController().signal

// Formato real de POST /auth/login da DummyJSON.
const loginResponse = {
  id: 1,
  username: 'emilys',
  email: 'emily.johnson@x.dummyjson.com',
  firstName: 'Emily',
  lastName: 'Johnson',
  gender: 'female',
  image: 'https://dummyjson.com/icon/emilys/128',
  accessToken: 'access.token.value',
  refreshToken: 'refresh.token.value',
}

afterEach(() => {
  restoreApiAdapter()
  setUnauthorizedHandler(null)
})

describe('authService.login (POST /auth/login)', () => {
  it('envia usuário, senha e duração da sessão e valida a resposta', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, loginResponse))

    const result = await login({ username: 'emilys', password: 'emilyspass' })

    const config = adapter.mock.lastCall?.[0]
    expect(config?.method).toBe('post')
    expect(config?.url).toBe('/auth/login')
    expect(JSON.parse(String(config?.data))).toEqual({
      username: 'emilys',
      password: 'emilyspass',
      expiresInMins: SESSION_DURATION_MINUTES,
    })
    expect(result.accessToken).toBe('access.token.value')
    expect(result.user).toEqual({
      id: 1,
      username: 'emilys',
      email: 'emily.johnson@x.dummyjson.com',
      firstName: 'Emily',
      lastName: 'Johnson',
      image: 'https://dummyjson.com/icon/emilys/128',
    })
    expect(result.user).not.toHaveProperty('refreshToken')
  })

  it('rejeita credenciais inválidas (HTTP 400) preservando a mensagem do servidor', async () => {
    mockApiAdapter((config) => {
      throw httpError(config, 400, { message: 'Invalid credentials' })
    })

    const promise = login({ username: 'emilys', password: 'errada' })

    await expect(promise).rejects.toMatchObject({ kind: 'http', status: 400, serverMessage: 'Invalid credentials' })
  })

  it('rejeita resposta sem accessToken (validação Zod)', async () => {
    const withoutToken = Object.fromEntries(Object.entries(loginResponse).filter(([key]) => key !== 'accessToken'))
    mockApiAdapter((config) => jsonResponse(config, withoutToken))

    await expect(login({ username: 'emilys', password: 'emilyspass' })).rejects.toMatchObject({ kind: 'validation' })
  })
})

describe('authService.fetchCurrentUser (GET /auth/me)', () => {
  it('envia o token informado e descarta campos sensíveis da resposta', async () => {
    const adapter = mockApiAdapter((config) =>
      jsonResponse(config, { ...authUserFixture, password: 'emilyspass', ssn: '123', bank: {} }),
    )

    const user = await fetchCurrentUser('token-a-validar', signal)

    const config = adapter.mock.lastCall?.[0]
    expect(config?.url).toBe('/auth/me')
    expect(config?.headers.get('Authorization')).toBe('Bearer token-a-validar')
    expect(user).toEqual(authUserFixture)
    expect(user).not.toHaveProperty('password')
  })

  it('prioriza o token explícito sobre o token salvo', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token-salvo')
    const adapter = mockApiAdapter((config) => jsonResponse(config, authUserFixture))

    await fetchCurrentUser('token-explicito', signal)

    expect(adapter.mock.lastCall?.[0].headers.get('Authorization')).toBe('Bearer token-explicito')
  })

  it('não aciona o encerramento global da sessão em 401 (tratado pela restauração)', async () => {
    const token = createTestToken()
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    mockApiAdapter((config) => {
      throw httpError(config, 401, { message: 'Token Expired!' })
    })

    await expect(fetchCurrentUser(token, signal)).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe('getLoginErrorMessage', () => {
  it('traduz credenciais inválidas', () => {
    const error = new ApiError('http', 'x', { status: 400, serverMessage: 'Invalid credentials' })
    expect(getLoginErrorMessage(error)).toBe('Usuário ou senha inválidos.')
  })

  it('traduz campos obrigatórios ausentes', () => {
    const error = new ApiError('http', 'x', { status: 400, serverMessage: 'Username and password required' })
    expect(getLoginErrorMessage(error)).toBe('Informe usuário e senha.')
  })

  it('mantém a mensagem amigável de falhas de rede', async () => {
    mockApiAdapter((config) => {
      throw networkError(config)
    })
    const error: unknown = await login({ username: 'a', password: 'b' }).catch((reason: unknown) => reason)

    if (!(error instanceof ApiError)) throw new Error('Esperava um ApiError.')
    expect(error.kind).toBe('network')
    expect(getLoginErrorMessage(error)).toMatch(/Não foi possível conectar/)
  })
})
