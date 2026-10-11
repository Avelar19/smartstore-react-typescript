import { expect, test as base } from '@playwright/test'
import type { Page } from '@playwright/test'

import { E2E_CREDENTIALS } from './data.ts'
import { DummyJsonMock } from './dummyJsonMock.ts'

/** Coleta erros de console e exceções da página; mensagens esperadas devem ser declaradas. */
export class ConsoleGuard {
  private readonly errors: { text: string; url: string }[] = []
  private readonly allowed: RegExp[] = []
  /** Documentos principais servidos com 404 pelo GitHub Pages (404.html do fallback de SPA). */
  private readonly fallbackDocuments = new Set<string>()

  constructor(page: Page) {
    page.on('console', (message) => {
      if (message.type() === 'error') this.errors.push({ text: message.text(), url: message.location().url })
    })
    page.on('pageerror', (error) => this.errors.push({ text: `pageerror: ${error.message}`, url: '' }))
    page.on('response', (response) => {
      const request = response.request()
      if (response.status() === 404 && request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        this.fallbackDocuments.add(response.url())
      }
    })
  }

  /** Declara um erro esperado no cenário (ex.: log do navegador para um 404 intencional). */
  allow(pattern: RegExp): void {
    this.allowed.push(pattern)
  }

  unexpected(): string[] {
    return this.errors
      .filter(({ text, url }) => !(text.includes('status of 404') && this.fallbackDocuments.has(url)))
      .map(({ text }) => text)
      .filter((text) => !this.allowed.some((pattern) => pattern.test(text)))
  }
}

interface Fixtures {
  api: DummyJsonMock
  consoleGuard: ConsoleGuard
}

export const test = base.extend<Fixtures>({
  api: [
    async ({ page }, provide) => {
      const api = new DummyJsonMock()
      await api.install(page)
      await provide(api)
      expect(api.unhandled, 'requisições para endpoints não simulados').toEqual([])
    },
    { auto: true },
  ],
  consoleGuard: [
    async ({ page }, provide) => {
      const guard = new ConsoleGuard(page)
      await provide(guard)
      expect(guard.unexpected(), 'erros inesperados no console').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Login pela interface (formulário real + POST /auth/login simulado). */
export async function loginThroughUi(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: 'Usuário' }).fill(E2E_CREDENTIALS.username)
  await page.getByLabel('Senha', { exact: true }).fill(E2E_CREDENTIALS.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function getStoredToken(page: Page): Promise<string | null> {
  return page.evaluate(() => sessionStorage.getItem('smartstore.accessToken'))
}
