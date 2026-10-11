import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/apiError.ts'
import { createDeferred } from '../tests/deferred.ts'
import type { ApiQueryFetcher } from './useApiQuery.ts'
import { useApiQuery } from './useApiQuery.ts'

describe('useApiQuery', () => {
  it('passa de loading para success', async () => {
    const fetcher = vi.fn<ApiQueryFetcher<string>>().mockResolvedValue('dados')

    const { result } = renderHook(() => useApiQuery(fetcher))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('dados')
  })

  it('expõe ApiError normalizado e permite tentar novamente', async () => {
    const fetcher = vi
      .fn<ApiQueryFetcher<string>>()
      .mockRejectedValueOnce(new ApiError('network', 'Sem conexão'))
      .mockResolvedValueOnce('recuperado')

    const { result } = renderHook(() => useApiQuery(fetcher))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('Sem conexão')

    act(() => result.current.retry())

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('recuperado')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('aborta a requisição anterior e descarta respostas desatualizadas', async () => {
    const slow = createDeferred<string>()
    const fast = createDeferred<string>()
    const signals: AbortSignal[] = []
    const slowFetcher: ApiQueryFetcher<string> = (signal) => {
      signals.push(signal)
      return slow.promise
    }
    const fastFetcher: ApiQueryFetcher<string> = (signal) => {
      signals.push(signal)
      return fast.promise
    }

    const { result, rerender } = renderHook(({ fetcher }) => useApiQuery(fetcher), {
      initialProps: { fetcher: slowFetcher },
    })
    rerender({ fetcher: fastFetcher })

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)

    await act(async () => {
      fast.resolve('resultado novo')
      await fast.promise
    })
    await act(async () => {
      slow.resolve('resultado antigo')
      await slow.promise
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('resultado novo')
  })

  it('aborta a requisição pendente ao desmontar (cleanup)', () => {
    let capturedSignal: AbortSignal | undefined
    const fetcher: ApiQueryFetcher<string> = (signal) => {
      capturedSignal = signal
      return new Promise<string>(() => undefined)
    }

    const { unmount } = renderHook(() => useApiQuery(fetcher))
    unmount()

    expect(capturedSignal?.aborted).toBe(true)
  })
})
