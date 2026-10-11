import { useCallback, useEffect, useState } from 'react'

import { toApiError } from '../services/apiError.ts'
import type { ApiError } from '../services/apiError.ts'

export type ApiQueryFetcher<T> = (signal: AbortSignal) => Promise<T>

export type ApiQueryState<T> =
  | { status: 'loading'; data: undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: ApiError }

export type ApiQueryResult<T> = ApiQueryState<T> & { retry: () => void }

interface SettledResult<T> {
  fetcher: ApiQueryFetcher<T>
  attempt: number
  state: ApiQueryState<T>
}

const LOADING_STATE = { status: 'loading', data: undefined, error: undefined } as const

/**
 * Executa uma requisição sempre que `fetcher` muda (o chamador deve memorizá-lo com useCallback).
 *
 * - A requisição anterior é abortada no cleanup do efeito (AbortController).
 * - Respostas de requisições substituídas são descartadas, evitando resultados desatualizados.
 * - O estado de carregamento é derivado: o resultado só vale para o fetcher/tentativa que o gerou.
 */
export function useApiQuery<T>(fetcher: ApiQueryFetcher<T>): ApiQueryResult<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<SettledResult<T> | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ fetcher, attempt, state: { status: 'success', data, error: undefined } })
        }
      },
      (error: unknown) => {
        const apiError = toApiError(error)
        if (!controller.signal.aborted && apiError.kind !== 'canceled') {
          setSettled({ fetcher, attempt, state: { status: 'error', data: undefined, error: apiError } })
        }
      },
    )

    return () => {
      controller.abort()
    }
  }, [fetcher, attempt])

  const retry = useCallback(() => {
    setAttempt((current) => current + 1)
  }, [])

  const isCurrent = settled !== null && settled.fetcher === fetcher && settled.attempt === attempt
  const state: ApiQueryState<T> = isCurrent ? settled.state : LOADING_STATE

  return { ...state, retry }
}
