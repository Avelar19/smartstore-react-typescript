import { expect, loginThroughUi, test } from './support/fixtures.ts'

const BASE_PATH = '/smartstore-react-typescript'

test.describe('Fluxo 4 — edição e exclusão', () => {
  test('edita com PUT, cancela e confirma exclusão com DELETE', async ({ page, api }) => {
    // 1–2. Painel autenticado e listagem administrativa.
    await page.goto('admin')
    await loginThroughUi(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeVisible()
    await page.getByRole('navigation', { name: 'Navegação administrativa' }).getByRole('link', { name: 'Produtos' }).click()
    const apiTable = page.getByRole('table', { name: 'Produtos da API' })
    await expect(apiTable.getByRole('row')).toHaveCount(11)

    // 3–5. Edição com PUT e reflexo na interface.
    await page.getByRole('link', { name: 'Editar Calvin Klein CK One' }).click()
    await expect(page).toHaveURL(`${BASE_PATH}/admin/products/3/edit`)
    await expect(page.getByRole('textbox', { name: 'Nome do produto' })).toHaveValue('Calvin Klein CK One')
    await page.getByRole('textbox', { name: 'Nome do produto' }).fill('CK One (edição E2E)')
    await page.getByRole('textbox', { name: 'Estoque' }).fill('15')
    const putRequest = page.waitForRequest((request) => request.method() === 'PUT')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    const put = await putRequest
    expect(new URL(put.url()).pathname).toBe('/products/3')
    expect(put.postDataJSON()).toMatchObject({ title: 'CK One (edição E2E)', stock: 15, category: 'fragrances' })

    const editedRow = apiTable.getByRole('row', { name: /CK One \(edição E2E\)/ })
    await expect(editedRow).toContainText('Editado')
    await expect(editedRow).toContainText('15')
    await expect(apiTable.getByRole('row', { name: /Calvin Klein CK One/ })).toHaveCount(0)

    // 6–7. Exclusão cancelada não envia nada.
    await page.getByRole('button', { name: 'Excluir Eyeshadow Palette with Mirror' }).click()
    const dialog = page.getByRole('dialog', { name: 'Excluir produto' })
    await expect(dialog).toContainText('Eyeshadow Palette with Mirror')
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialog).toBeHidden()
    expect(api.writes().filter((request) => request.method === 'DELETE')).toEqual([])
    await expect(apiTable.getByRole('row', { name: /Eyeshadow Palette with Mirror/ })).toHaveCount(1)

    // 8–10. Exclusão confirmada com DELETE e atualização do estado local.
    await page.getByRole('button', { name: 'Excluir Eyeshadow Palette with Mirror' }).click()
    const deleteRequest = page.waitForRequest((request) => request.method() === 'DELETE')
    await dialog.getByRole('button', { name: 'Excluir' }).click()
    expect(new URL((await deleteRequest).url()).pathname).toBe('/products/2')
    await expect(dialog).toBeHidden()
    await expect(apiTable.getByRole('row', { name: /Eyeshadow Palette with Mirror/ })).toHaveCount(0)
    await expect(page.getByText('12 produtos na API · página 1 de 2 · 1 excluído(s) nesta sessão')).toBeVisible()

    // As alterações sobrevivem à navegação (a API, como a real, continua devolvendo os originais).
    await page.getByRole('navigation', { name: 'Navegação administrativa' }).getByRole('link', { name: 'Visão geral' }).click()
    await expect(page.getByText('1 editado(s)')).toBeVisible()
    await expect(page.getByText('1 excluído(s)')).toBeVisible()
    await page.getByRole('navigation', { name: 'Navegação administrativa' }).getByRole('link', { name: 'Produtos' }).click()
    await expect(apiTable.getByRole('row', { name: /CK One \(edição E2E\)/ })).toHaveCount(1)
    await expect(apiTable.getByRole('row', { name: /Eyeshadow Palette with Mirror/ })).toHaveCount(0)
  })
})
