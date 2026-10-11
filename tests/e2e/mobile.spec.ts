import { expect, loginThroughUi, test } from './support/fixtures.ts'

const BASE_PATH = '/smartstore-react-typescript'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test.describe('Viewport móvel (390 px)', () => {
  test('menu móvel navega, fecha e reflete a sessão', async ({ page }) => {
    await page.goto('.')
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden()

    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Menu móvel' })
    await expect(menu.getByRole('link')).toHaveText(['Início', 'Catálogo', 'Entrar'])

    await menu.getByRole('link', { name: 'Catálogo' }).click()
    await expect(page).toHaveURL(`${BASE_PATH}/products`)
    await expect(menu).toBeHidden()
    await expect(page.getByText('12 produtos encontrados · página 1 de 2')).toBeVisible()
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(hasHorizontalScroll).toBe(false)

    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await menu.getByRole('link', { name: 'Entrar' }).click()
    await loginThroughUi(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeVisible()

    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(menu.getByRole('link')).toHaveText(['Início', 'Catálogo', 'Painel administrativo'])
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/?$`))
  })
})
