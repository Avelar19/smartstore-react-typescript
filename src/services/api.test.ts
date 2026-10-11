import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  httpError,
  jsonResponse,
  mockApiAdapter,
  networkError,
  restoreApiAdapter,
  timeoutError,
} from '../tests/axiosMock.ts'
import { api, API_BASE_URL, API_TIMEOUT_MS, setUnauthorizedHandler } from './api.ts'
import { ApiError, toApiError } from './apiError.ts'
import { ACCESS_TOKEN_STORAGE_KEY } from './tokenStorage.ts'

afterEach(() => {
  restoreApiAdapter()
  setUnauthorizedHandler(null)
  sessionStorage.clear()
})

async function captureRejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('A requisição deveria ter falhado.')
}

describe('instância Axios (api.ts)', () => {
  it('usa a baseURL da DummyJSON e timeout configurado', () => {
    expect(api.defaults.baseURL).toBe(API_BASE_URL)
    expect(API_BASE_URL).toBe('https://dummyjson.com')
    expect(api.defaults.timeout).toBe(API_TIMEOUT_MS)
  })

  it('não envia Authorization quando não há token', async () => {
    const adapter = mockApiAdapter((config) => jsonResponse(config, {}))

    await api.get('/products')

    expect(adapter.mock.calls[0]?.[0].headers.get('Authorization')).toBeUndefined()
  })

  it('adiciona Authorization Bearer quando há token armazenado', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token-de-teste')
    const adapter = mockApiAdapter((config) => jsonResponse(config, {}))

    await api.get('/products')

    expect(adapter.mock.calls[0]?.[0].headers.get('Authorization')).toBe('Bearer token-de-teste')
  })

  it('normaliza erro HTTP 404 preservando status e mensagem do servidor', async () => {
    mockApiAdapter((config) => {
      throw httpError(config, 404, { message: "Product with id '999' not found" })
    })

    const error = await captureRejection(api.get('/products/999'))

    expect(error.kind).toBe('http')
    expect(error.status).toBe(404)
    expect(error.message).toBe('O recurso solicitado não foi encontrado.')
    expect(error.serverMessage).toBe("Product with id '999' not found")
  })

  it('normaliza erro HTTP 500 com mensagem amigável', async () => {
    mockApiAdapter((config) => {
      throw httpError(config, 503, 'Service Unavailable')
    })

    const error = await captureRejection(api.get('/products'))

    expect(error.kind).toBe('http')
    expect(error.status).toBe(503)
    expect(error.message).toMatch(/servidor está indisponível/)
    expect(error.serverMessage).toBeUndefined()
  })

  it('normaliza limite de requisições (HTTP 429)', async () => {
    mockApiAdapter((config) => {
      throw httpError(config, 429, { message: 'Too Many Requests' })
    })

    const error = await captureRejection(api.get('/products'))

    expect(error).toMatchObject({ kind: 'http', status: 429 })
    expect(error.message).toMatch(/Muitas requisições/)
  })

  it('normaliza erro 400 genérico com o código no texto', async () => {
    mockApiAdapter((config) => {
      throw httpError(config, 400, {})
    })

    const error = await captureRejection(api.get('/products'))

    expect(error.message).toBe('Não foi possível concluir a requisição (erro 400).')
  })

  it('normaliza falha de conexão', async () => {
    mockApiAdapter((config) => {
      throw networkError(config)
    })

    const error = await captureRejection(api.get('/products'))

    expect(error.kind).toBe('network')
    expect(error.message).toMatch(/Não foi possível conectar/)
  })

  it('normaliza timeout', async () => {
    mockApiAdapter((config) => {
      throw timeoutError(config)
    })

    const error = await captureRejection(api.get('/products'))

    expect(error.kind).toBe('timeout')
  })

  it('identifica requisições canceladas', async () => {
    mockApiAdapter((config) => jsonResponse(config, {}))
    const controller = new AbortController()
    controller.abort()

    const error = await captureRejection(api.get('/products', { signal: controller.signal }))

    expect(error.kind).toBe('canceled')
  })
})

describe('toApiError', () => {
  it('converte erros que não vêm do Axios em ApiError "unknown"', () => {
    const error = toApiError(new TypeError('falha inesperada'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'unknown', message: 'Ocorreu um erro inesperado.' })
  })

  it('mantém um ApiError já normalizado', () => {
    const original = new ApiError('timeout', 'x')
    expect(toApiError(original)).toBe(original)
  })
})

describe('interceptor de resposta — HTTP 401', () => {
  function rejectWith401() {
    mockApiAdapter((config) => {
      throw httpError(config, 401, { message: 'Token Expired!' })
    })
  }

  it('encerra a sessão quando o token atual é recusado', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token-atual')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    rejectWith401()

    const error = await captureRejection(api.get('/auth/me'))

    expect(error.status).toBe(401)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('ignora 401 de requisições sem token (públicas)', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    rejectWith401()

    await captureRejection(api.get('/products'))

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('ignora 401 de requisições enviadas com outro token', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token-atual')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    rejectWith401()

    await captureRejection(api.get('/auth/me', { headers: { Authorization: 'Bearer outro-token' } }))

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('ignora outros erros HTTP mesmo com token', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token-atual')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    mockApiAdapter((config) => {
      throw httpError(config, 403, {})
    })

    await captureRejection(api.get('/products'))

    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
