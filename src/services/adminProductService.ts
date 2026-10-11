import { productDeleteResponseSchema, productWriteResponseSchema } from '../schemas/adminProduct.ts'
import type { ProductInput, ProductWriteResponse } from '../schemas/adminProduct.ts'
import { api } from './api.ts'
import { ApiError } from './apiError.ts'
import { parseApiResponse } from './validation.ts'

// Operações de escrita da DummyJSON. A API responde como se gravasse, mas NÃO persiste nada:
// as alterações são mantidas apenas no estado local da sessão (ProductChangesProvider).

export interface WriteResult {
  /** Id retornado pela API. */
  id: number
  /** Dados confirmados: campos ecoados pela API, com os enviados como complemento. */
  product: ProductInput
}

function mergeConfirmed(input: ProductInput, response: ProductWriteResponse): ProductInput {
  return {
    title: response.title ?? input.title,
    description: response.description ?? input.description,
    category: response.category ?? input.category,
    price: response.price ?? input.price,
    stock: response.stock ?? input.stock,
  }
}

/** POST /products/add */
export async function createProduct(input: ProductInput): Promise<WriteResult> {
  const response = await api.post<unknown>('/products/add', input)
  const data = parseApiResponse(productWriteResponseSchema, response.data)
  return { id: data.id, product: mergeConfirmed(input, data) }
}

/** PUT /products/:id */
export async function updateProduct(id: number, input: ProductInput): Promise<WriteResult> {
  const response = await api.put<unknown>(`/products/${id}`, input)
  const data = parseApiResponse(productWriteResponseSchema, response.data)
  if (data.id !== id) {
    throw new ApiError('validation', 'A API confirmou a alteração de outro produto.')
  }
  return { id: data.id, product: mergeConfirmed(input, data) }
}

/** DELETE /products/:id — exige a confirmação `isDeleted: true` do produto solicitado. */
export async function deleteProduct(id: number): Promise<void> {
  const response = await api.delete<unknown>(`/products/${id}`)
  const data = parseApiResponse(productDeleteResponseSchema, response.data)
  if (data.id !== id) {
    throw new ApiError('validation', 'A API confirmou a exclusão de outro produto.')
  }
}
