import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { vi } from 'vitest'

import { api } from '../services/api.ts'

type Handler = (config: InternalAxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>

const originalAdapter = api.defaults.adapter

/**
 * Substitui o adaptador HTTP da instância `api`: a requisição passa pelos interceptors
 * reais, mas a resposta é gerada localmente (sem rede).
 */
export function mockApiAdapter(handler: Handler) {
  const adapter = vi.fn<AxiosAdapter>((config) => Promise.resolve(handler(config)))
  api.defaults.adapter = adapter
  return adapter
}

export function restoreApiAdapter(): void {
  if (originalAdapter === undefined) {
    delete api.defaults.adapter
  } else {
    api.defaults.adapter = originalAdapter
  }
}

export function jsonResponse(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: String(status), headers: new AxiosHeaders(), config }
}

export function httpError(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    jsonResponse(config, data, status),
  )
}

export function networkError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
}

export function timeoutError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('timeout of 10000ms exceeded', AxiosError.ECONNABORTED, config)
}
