import { expect, test } from './support/fixtures.ts'

const BASE_PATH = '/smartstore-react-typescript'

test.describe('Fluxo 1 — catálogo e detalhes', () => {
  test('pesquisa um produto, abre os detalhes e volta preservando a busca', async ({ page }) => {
    // 1–2. Abre a aplicação e navega até o catálogo pelo menu.
    await page.goto('.')
    await expect(page.getByRole('heading', { level: 1, name: 'Tecnologia, beleza e casa em um só lugar' })).toBeVisible()
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Catálogo' }).click()
    await expect(page).toHaveURL(`${BASE_PATH}/products`)

    // 3. Produtos renderizados com paginação real (limit/skip).
    await expect(page.getByText('12 produtos encontrados · página 1 de 2')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(8)

    // 4–5. Busca e resultados.
    await page.getByRole('searchbox', { name: 'Buscar produtos' }).fill('iphone')
    await expect(page.getByText('1 produto encontrado para “iphone”')).toBeVisible()
    await expect(page).toHaveURL(`${BASE_PATH}/products?q=iphone`)
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['iPhone 13 Pro'])

    // 6–7. Detalhes com informações e imagens reais (carregadas no navegador).
    await page.getByRole('link', { name: 'Ver detalhes de iPhone 13 Pro' }).click()
    await expect(page).toHaveURL(`${BASE_PATH}/products/8`)
    await expect(page.getByRole('heading', { level: 1, name: 'iPhone 13 Pro' })).toBeVisible()
    await expect(page).toHaveTitle('iPhone 13 Pro | SmartStore')
    await expect(page.getByText('Smartphones', { exact: true })).toBeVisible()
    await expect(page.getByText(/US\$\s1\.099,99/)).toBeVisible()
    await expect(page.getByText('56 unidades em estoque')).toBeVisible()

    const mainImage = page.getByRole('img', { name: 'iPhone 13 Pro' })
    await expect(mainImage).toHaveAttribute('src', /cdn\.dummyjson\.com\/.+\/1\.webp$/)
    await expect.poll(() => mainImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Ver imagem 2 de iPhone 13 Pro' }).click()
    await expect(mainImage).toHaveAttribute('src', /\/2\.webp$/)

    // 8–9. Volta ao catálogo com a busca preservada.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL(`${BASE_PATH}/products?q=iphone`)
    await expect(page.getByRole('searchbox', { name: 'Buscar produtos' })).toHaveValue('iphone')
    await expect(page.getByText('1 produto encontrado para “iphone”')).toBeVisible()
  })

  test('pagina e filtra por categoria com rótulo traduzido', async ({ page, api }) => {
    await page.goto('products')
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page.getByText('12 produtos encontrados · página 2 de 2')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(4)

    await page.getByRole('combobox', { name: 'Categoria' }).click()
    await page.getByRole('option', { name: 'Notebooks' }).click()
    await expect(page.getByText('3 produtos encontrados em Notebooks')).toBeVisible()
    expect(api.requests.some((request) => request.path === '/products/category/laptops')).toBe(true)
  })
})

test.describe('Navegação e rotas', () => {
  test('acesso direto a /products/:id carrega o produto pela API', async ({ page, api }) => {
    await page.goto('products/5')

    await expect(page.getByRole('heading', { level: 1, name: 'Apple MacBook Pro 14 Inch Space Grey' })).toBeVisible()
    expect(api.requests.map((request) => request.path)).toContain('/products/5')

    // Sem histórico interno, "Voltar" leva ao catálogo.
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL(`${BASE_PATH}/products`)
  })

  test('produto inexistente exibe mensagem amigável', async ({ page, consoleGuard }) => {
    consoleGuard.allow(/status of 404/)
    await page.goto('products/999')

    await expect(page.getByRole('heading', { name: 'Produto não encontrado' })).toBeVisible()
  })

  test('rota inexistente exibe a página 404 dentro do layout', async ({ page }) => {
    await page.goto('rota/que/nao/existe')

    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
    await page.getByRole('link', { name: 'Ir para o início' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/?$`))
  })

  test('links internos respeitam o basename do GitHub Pages', async ({ page }) => {
    await page.goto('.')
    const navigation = page.getByRole('navigation', { name: 'Navegação principal' })

    await expect(navigation.getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', `${BASE_PATH}/products`)
    await expect(page.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', `${BASE_PATH}/login`)
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', `${BASE_PATH}/favicon.svg`)
  })

  test('erro da API exibe alerta e "Tentar novamente" recupera a listagem', async ({ page, consoleGuard }) => {
    consoleGuard.allow(/status of 500/)
    let failures = 0
    await page.route('https://dummyjson.com/products?*', async (route) => {
      if (failures === 0) {
        failures += 1
        await route.fulfill({ status: 500, json: { message: 'Internal Server Error' } })
        return
      }
      await route.fallback()
    })

    await page.goto('products')

    const alert = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os produtos' })
    await expect(alert).toContainText('O servidor está indisponível no momento.')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText('12 produtos encontrados · página 1 de 2')).toBeVisible()
  })
})
