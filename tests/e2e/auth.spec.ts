import { createTestJwt } from './support/jwt.ts'
import { expect, getStoredToken, loginThroughUi, test } from './support/fixtures.ts'

const BASE_PATH = '/smartstore-react-typescript'

test.describe('Fluxo 2 — login e rota protegida', () => {
  test('redireciona, autentica, restaura a sessão e faz logout', async ({ page, api, consoleGuard }) => {
    consoleGuard.allow(/status of 400/)

    // 1–2. Acesso direto a /admin redireciona ao login.
    await page.goto('admin')
    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    await expect(page.getByText('Faça login para acessar a área administrativa.')).toBeVisible()

    // 3. Credenciais inválidas.
    await page.getByRole('textbox', { name: 'Usuário' }).fill('usuario.e2e')
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível entrar' })).toContainText(
      'Usuário ou senha inválidos.',
    )
    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    expect(await getStoredToken(page)).toBeNull()

    // 4–5. Login válido volta à rota solicitada.
    const loginResponse = page.waitForResponse((response) => response.url().endsWith('/auth/login') && response.ok())
    await loginThroughUi(page)
    const { accessToken } = (await (await loginResponse).json()) as { accessToken: string }
    await expect(page).toHaveURL(`${BASE_PATH}/admin`)
    await expect(page.getByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeVisible()
    await expect(page.getByText('Olá, Ana! Você está autenticado na SmartStore.')).toBeVisible()
    expect(await getStoredToken(page)).toBe(accessToken)
    const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))
    expect(storage).not.toContain('senha-e2e-123')

    // 6–7. Recarregar restaura a sessão validando o token em /auth/me.
    const meRequest = page.waitForRequest((request) => request.url().endsWith('/auth/me'))
    await page.reload()
    expect((await meRequest).headers()['authorization']).toBe(`Bearer ${accessToken}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Painel administrativo' })).toBeVisible()
    await expect(page.getByLabel('Usuário autenticado: Ana Teste')).toBeVisible()

    // 8–9. Logout remove o token.
    await page.getByRole('banner').getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE_PATH}/?$`))
    await expect(page.getByText('Você saiu da sua conta.')).toBeVisible()
    expect(await getStoredToken(page)).toBeNull()

    // 10. /admin volta a exigir autenticação.
    await page.goto('admin')
    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    expect(api.requests.filter((request) => request.path === '/auth/me')).toHaveLength(1)
  })

  test('token expirado salvo é descartado sem consultar a API', async ({ page, api }) => {
    await page.goto('.')
    await page.evaluate((token) => sessionStorage.setItem('smartstore.accessToken', token), createTestJwt(-60))

    await page.goto('admin')

    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    await expect(page.getByText(/Sua sessão expirou/)).toBeVisible()
    expect(await getStoredToken(page)).toBeNull()
    expect(api.requests.some((request) => request.path === '/auth/me')).toBe(false)
  })

  test('token recusado pelo servidor ("invalid token") encerra a sessão', async ({ page, consoleGuard }) => {
    consoleGuard.allow(/status of 500/)
    await page.goto('.')
    // Token com expiração futura, mas não emitido pela API simulada.
    await page.evaluate((token) => sessionStorage.setItem('smartstore.accessToken', token), createTestJwt(3600))

    await page.goto('admin')

    await expect(page).toHaveURL(`${BASE_PATH}/login`)
    expect(await getStoredToken(page)).toBeNull()
  })
})
