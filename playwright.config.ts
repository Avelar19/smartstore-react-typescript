import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const PORT = 4173
// Mesmo subcaminho do GitHub Pages (base do Vite no build/preview).
const BASE_PATH = '/smartstore-react-typescript/'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  // Sem novas tentativas: falhas intermitentes devem aparecer, não ser escondidas.
  retries: 0,
  // Runners do GitHub Actions têm 2–4 vCPUs.
  ...(isCI && { workers: 2 }),
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    // Caminhos relativos nos testes (page.goto('products')) passam pelo basename do roteador.
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    headless: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Artefatos de diagnóstico apenas quando um teste falha.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Testa o build de produção servido como no GitHub Pages: sem fallback de SPA, com o 404.html
  // gerado no build (o `vite preview` responderia 200 a qualquer rota e esconderia o problema).
  webServer: {
    command: `yarn build && node scripts/serve-github-pages.ts ${PORT}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
