import { describe, expect, it } from 'vitest'

import { createProductFormSchema, productDeleteResponseSchema, productWriteResponseSchema } from './adminProduct.ts'

const schema = createProductFormSchema(['laptops', 'beauty'])
const valid = { title: '  Notebook  ', description: ' Ótimo ', category: 'laptops', price: 1299.9, stock: 3 }

function firstMessage(values: Record<string, unknown>, field: string): string | undefined {
  const result = schema.safeParse(values)
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe('createProductFormSchema', () => {
  it('aceita dados válidos, remove espaços extras e mantém números', () => {
    expect(schema.parse(valid)).toEqual({
      title: 'Notebook',
      description: 'Ótimo',
      category: 'laptops',
      price: 1299.9,
      stock: 3,
    })
  })

  it.each([
    ['title', '   ', 'Informe o nome do produto.'],
    ['description', '', 'Informe a descrição do produto.'],
    ['category', 'inexistente', 'Selecione uma categoria válida.'],
    ['category', '', 'Selecione uma categoria válida.'],
    ['price', '', 'Informe o preço.'],
    ['price', 0, 'O preço deve ser maior que zero.'],
    ['price', -5, 'O preço deve ser maior que zero.'],
    ['stock', '', 'Informe o estoque.'],
    ['stock', 1.5, 'O estoque deve ser um número inteiro.'],
    ['stock', -1, 'O estoque não pode ser negativo.'],
  ])('%s = %o → "%s"', (field, value, message) => {
    expect(firstMessage({ ...valid, [field]: value }, field)).toBe(message)
  })

  it('aceita estoque zero', () => {
    expect(schema.safeParse({ ...valid, stock: 0 }).success).toBe(true)
  })
})

describe('schemas de resposta de escrita', () => {
  it('aceita a resposta mínima real do POST /products/add', () => {
    expect(productWriteResponseSchema.safeParse({ id: 195 }).success).toBe(true)
    expect(productWriteResponseSchema.safeParse({ id: 195, title: 'X', price: 9.9, stock: 1 }).success).toBe(true)
  })

  it('rejeita resposta sem id ou com tipos incorretos', () => {
    expect(productWriteResponseSchema.safeParse({ title: 'X' }).success).toBe(false)
    expect(productWriteResponseSchema.safeParse({ id: 1, price: '9.9' }).success).toBe(false)
  })

  it('exige a confirmação isDeleted no DELETE', () => {
    expect(productDeleteResponseSchema.safeParse({ id: 1, isDeleted: true, deletedOn: '2026-10-11T00:00:00Z' }).success).toBe(
      true,
    )
    expect(productDeleteResponseSchema.safeParse({ id: 1, isDeleted: false, deletedOn: 'x' }).success).toBe(false)
    expect(productDeleteResponseSchema.safeParse({ id: 1 }).success).toBe(false)
  })
})
