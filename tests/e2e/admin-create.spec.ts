import type { Page } from '@playwright/test'

import { expect, getStoredToken, loginThroughUi, test } from './support/fixtures.ts'

const BASE_PATH = '/smartstore-react-typescript'

async function fillProductForm(page: Page) {
  await page.getByRole('textbox', { name: 'Nome do produto' }).fill('Notebook E2E')
  await page.getByRole('textbox', { name: 'Descrição' }).fill('Produto cadastrado pelo teste E2E')
  await page.getByRole('combobox', { name: 'Categoria' }).click()
  await page.getByRole('option', { name: 'Notebooks' }).click()
  await page.getByRole('textbox', { name: 'Preço (US$)' }).fill('1299,9')
  await page.getByRole('textbox', { name: 'Estoque' }).fill('7')
}

test.describe('Fluxo 3 — cadastro administrativo', () => {
  test('valida, envia POST com números e exibe o produto como operação simulada', async ({ page, api }) => {
    // 1–2. Autentica e abre o formulário (retorno à rota solicitada).
    await page.goto('admin/products/new')
    await loginThroughUi(page)
    await expect(page).toHaveURL(`${BASE_PATH}/admin/products/new`)
    await expect(page.getByRole('heading', { level: 1, name: 'Novo produto' })).toBeVisible()

    // 3–4. Formulário vazio: erros do Zod e nenhuma requisição.
    await page.getByRole('button', { name: 'Cadastrar produto' }).click()
    for (const message of [
      'Informe o nome do produto.',
      'Informe a descrição do produto.',
      'Selecione uma categoria válida.',
      'Informe o preço.',
      'Informe o estoque.',
    ]) {
      await expect(page.getByText(message)).toBeVisible()
    }
    expect(api.writes().filter((request) => request.path.startsWith('/products'))).toEqual([])

    // 5–7. Preenche, envia e confere o POST.
    await fillProductForm(page)
    const postRequest = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/products/add'),
    )
    await page.getByRole('button', { name: 'Cadastrar produto' }).click()
    const request = await postRequest
    const body = request.postDataJSON() as Record<string, unknown>
    expect(body).toEqual({
      title: 'Notebook E2E',
      description: 'Produto cadastrado pelo teste E2E',
      category: 'laptops',
      price: 1299.9,
      stock: 7,
    })
    expect(typeof body['price']).toBe('number')
    expect(typeof body['stock']).toBe('number')
    expect(request.headers()['authorization']).toBe(`Bearer ${await getStoredToken(page)}`)

    // 8–10. Sucesso, listagem e aviso de simulação.
    await expect(page.getByText('“Notebook E2E” foi cadastrado nesta sessão.')).toBeVisible()
    await expect(page).toHaveURL(`${BASE_PATH}/admin/products`)
    const row = page.getByRole('table', { name: 'Produtos cadastrados nesta sessão' }).getByRole('row', { name: /Notebook E2E/ })
    await expect(row).toContainText('Novo (local)')
    await expect(row).toContainText('Notebooks')
    await expect(row).toContainText(/US\$\s1\.299,90/)
    await expect(page.getByRole('note').filter({ hasText: 'Modo demonstração' })).toContainText(
      'não persiste nenhuma alteração',
    )
  })

  test('sessão expirada durante o cadastro leva ao login', async ({ page, consoleGuard }) => {
    consoleGuard.allow(/status of 401/)
    await page.goto('admin/products/new')
    await loginThroughUi(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Novo produto' })).toBeVisible()
    await page.route('https://dummyjson.com/products/add', (route) =>
      route.fulfill({ status: 401, json: { message: 'Token Expired!' } }),
    )

    await fillProductForm(page)
    await page.getByRole('button', { name: 'Cadastrar produto' }).click()

    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    await expect(page.getByText(/Sua sessão expirou/)).toHaveCount(1)
    await expect(page.getByText('Não foi possível cadastrar o produto')).toHaveCount(0)
    expect(await getStoredToken(page)).toBeNull()
  })
})
