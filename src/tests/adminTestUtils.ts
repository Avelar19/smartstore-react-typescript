import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

import { createTestToken, storeSessionToken } from './fixtures/auth.ts'
import { renderRoute } from './test-utils.tsx'

/** Renderiza uma rota administrativa já com sessão válida (restaurada via /auth/me mockado). */
export function renderAdminRoute(path: string) {
  storeSessionToken(createTestToken())
  return renderRoute(path)
}

/** Aguarda a linha da tabela com o produto (o mesmo texto pode aparecer fora da tabela). */
export function findProductRow(title: string) {
  return waitFor(() => {
    const row = screen
      .queryAllByText(title)
      .map((element) => element.closest('tr'))
      .find((element) => element !== null)
    if (!row) throw new Error(`Linha do produto "${title}" não encontrada.`)
    return row
  })
}

export interface ProductFormData {
  title?: string
  description?: string
  category?: string
  price?: string
  stock?: string
}

/** Preenche o formulário de produto (campos omitidos permanecem como estão). */
export async function fillProductForm(user: UserEvent, data: ProductFormData) {
  const fields: [keyof ProductFormData, string][] = [
    ['title', 'Nome do produto'],
    ['description', 'Descrição'],
    ['price', 'Preço (US$)'],
    ['stock', 'Estoque'],
  ]
  for (const [key, label] of fields) {
    const value = data[key]
    if (value === undefined) continue
    const input = screen.getByRole('textbox', { name: label })
    await user.clear(input)
    if (value !== '') await user.type(input, value)
  }
  if (data.category !== undefined) {
    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: data.category }))
  }
}

export function getTableRows(tableLabel: string) {
  return within(screen.getByRole('table', { name: tableLabel })).getAllByRole('row').slice(1)
}
