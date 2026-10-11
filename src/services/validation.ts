import type { z } from 'zod'

import { ApiError } from './apiError.ts'

/** Valida dados externos com safeParse; falhas viram ApiError do tipo "validation". */
export function parseApiResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ApiError('validation', 'Os dados recebidos do servidor estão em um formato inesperado.', {
      cause: result.error,
    })
  }

  return result.data
}
