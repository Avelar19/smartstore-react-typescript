import type { ProductInput } from '../schemas/adminProduct.ts'

/**
 * Identidade de um produto na área administrativa.
 * - api: produto real da DummyJSON (id da API)
 * - local: criado nesta sessão; a API devolve sempre o mesmo id para novos produtos,
 *   por isso a identidade usa um contador local.
 */
export type ProductRef = { kind: 'api'; id: number } | { kind: 'local'; localId: number }

/** Produto criado nesta sessão (existe apenas no estado local). */
export interface LocalProduct extends ProductInput {
  localId: number
  /** Id devolvido pela API no cadastro (informativo; não é único). */
  apiId: number
}

export type AdminProductStatus = 'original' | 'edited' | 'created'

/** Linha exibida na listagem administrativa. */
export interface AdminProductRow {
  ref: ProductRef
  key: string
  title: string
  category: string
  price: number
  stock: number
  thumbnail: string
  status: AdminProductStatus
}
