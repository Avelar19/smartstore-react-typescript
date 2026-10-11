import { z } from 'zod'

/** Valores do formulário: o NumberInput do Mantine emite `number` ou `''` (campo vazio). */
export type ProductFormValues = {
  title: string
  description: string
  category: string
  price: number | string
  stock: number | string
}

/**
 * Schema do formulário de produto. As categorias válidas vêm da API, por isso o schema é
 * criado a partir da lista carregada.
 */
export function createProductFormSchema(categorySlugs: readonly string[]) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Informe o nome do produto.')
      .max(120, 'O nome deve ter no máximo 120 caracteres.'),
    description: z
      .string()
      .trim()
      .min(1, 'Informe a descrição do produto.')
      .max(1000, 'A descrição deve ter no máximo 1000 caracteres.'),
    category: z.string().refine((value) => categorySlugs.includes(value), 'Selecione uma categoria válida.'),
    price: z
      .number({ error: 'Informe o preço.' })
      .positive('O preço deve ser maior que zero.')
      .max(1_000_000, 'O preço deve ser menor que R$ 1.000.000.'),
    stock: z
      .number({ error: 'Informe o estoque.' })
      .int('O estoque deve ser um número inteiro.')
      .min(0, 'O estoque não pode ser negativo.')
      .max(1_000_000, 'O estoque deve ser menor que 1.000.000.'),
  })
}

/** Dados validados enviados à API (preço e estoque como números). */
export type ProductInput = z.output<ReturnType<typeof createProductFormSchema>>

/**
 * Resposta de POST /products/add e PUT /products/:id. A DummyJSON devolve o `id` e ecoa apenas
 * os campos recebidos (no POST, um corpo vazio retorna só `{ id }`), por isso todos são opcionais.
 */
export const productWriteResponseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
  stock: z.number().int().optional(),
})

/** Resposta de DELETE /products/:id: o produto com a marcação de exclusão. */
export const productDeleteResponseSchema = z.object({
  id: z.number().int().positive(),
  isDeleted: z.literal(true),
  deletedOn: z.string().min(1),
})

export type ProductWriteResponse = z.infer<typeof productWriteResponseSchema>
