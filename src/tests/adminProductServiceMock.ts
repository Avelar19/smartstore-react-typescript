import { vi } from 'vitest'

import { createProduct, deleteProduct, updateProduct } from '../services/adminProductService.ts'

/**
 * Respostas determinísticas do CRUD simulado (o arquivo de teste deve chamar
 * `vi.mock('<caminho>/services/adminProductService.ts')`). Como na DummyJSON real,
 * todo cadastro recebe o id 195.
 */
export function setupAdminProductServiceMock(): void {
  vi.mocked(createProduct).mockImplementation((product) => Promise.resolve({ id: 195, product }))
  vi.mocked(updateProduct).mockImplementation((id, product) => Promise.resolve({ id, product }))
  vi.mocked(deleteProduct).mockResolvedValue(undefined)
}
