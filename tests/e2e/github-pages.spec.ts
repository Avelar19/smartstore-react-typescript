import { expect, loginThroughUi, test } from './support/fixtures.ts'

const BASE_PATH = '/smartstore-react-typescript'

// O servidor dos testes reproduz o GitHub Pages: rotas da SPA recebem o 404.html (status 404),
// que redireciona para /?/rota e o index.html restaura a URL original antes do React iniciar.
test.describe('GitHub Pages — links diretos e recarregamento', () => {
  const publicRoutes = [
    { path: 'products', heading: 'Catálogo', status: '12 produtos encontrados · página 1 de 2' },
    { path: 'products/8', heading: 'iPhone 13 Pro', status: null },
    { path: 'products?q=phone', heading: 'Catálogo', status: '3 produtos encontrados para “phone”' },
    { path: 'products?category=laptops&page=1', heading: 'Catálogo', status: '3 produtos encontrados em Notebooks' },
  ]

  for (const route of publicRoutes) {
    test(`acesso direto a /${route.path} passa pelo 404.html e restaura a URL`, async ({ page }) => {
      const response = await page.goto(route.path)

      // O documento inicial é o 404.html do Pages; a URL final é a original, com a query intacta.
      expect(response?.status()).toBe(404)
      await expect(page).toHaveURL(`${BASE_PATH}/${route.path}`)
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
      if (route.status) await expect(page.getByText(route.status, { exact: false }).first()).toBeVisible()
    })
  }

  test('recarregar uma rota profunda mantém a página', async ({ page }) => {
    await page.goto('products/8')
    await expect(page.getByRole('heading', { level: 1, name: 'iPhone 13 Pro' })).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL(`${BASE_PATH}/products/8`)
    await expect(page.getByRole('heading', { level: 1, name: 'iPhone 13 Pro' })).toBeVisible()
  })

  test('o redirecionamento não deixa entradas extras no histórico', async ({ page }) => {
    await page.goto('.')
    await page.goto('products/8')
    await expect(page.getByRole('heading', { level: 1, name: 'iPhone 13 Pro' })).toBeVisible()

    await page.goBack()

    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Tecnologia, beleza e casa em um só lugar' })).toBeVisible()
  })

  test('acesso direto a /admin redireciona ao login e volta após autenticar', async ({ page }) => {
    await page.goto('admin')

    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    await loginThroughUi(page)
    await expect(page).toHaveURL(`${BASE_PATH}/admin`)
    await expect(page.getByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeVisible()
  })

  test('acesso direto a /admin/products/new preserva a rota até depois do login', async ({ page }) => {
    await page.goto('admin/products/new')

    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    await loginThroughUi(page)
    await expect(page).toHaveURL(`${BASE_PATH}/admin/products/new`)
    await expect(page.getByRole('heading', { level: 1, name: 'Novo produto' })).toBeVisible()
  })

  test('/smartstore-react-typescript sem barra final é redirecionado para a Home', async ({ page }) => {
    await page.goto(BASE_PATH)

    await expect(page).toHaveURL(`${BASE_PATH}/`)
    await expect(page.getByRole('heading', { level: 1, name: 'Tecnologia, beleza e casa em um só lugar' })).toBeVisible()
  })
})
