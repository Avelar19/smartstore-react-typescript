import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { githubPagesSpaFallback } from './build/githubPagesSpaFallback.ts'

// Nome do repositório no GitHub: define o subcaminho publicado no GitHub Pages
// (https://<usuario>.github.io/smartstore-react-typescript/).
const REPOSITORY_NAME = 'smartstore-react-typescript'

// https://vite.dev/config/
// O servidor de desenvolvimento usa "/"; build e preview usam o subcaminho do Pages,
// para que o preview local reproduza exatamente o ambiente publicado.
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), githubPagesSpaFallback()],
  base: command === 'build' || isPreview === true ? `/${REPOSITORY_NAME}/` : '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Cada arquivo roda em um worker com jsdom (uso intenso de CPU). Usar todos os núcleos
    // satura a máquina e atrasa o agendador do React, gerando falhas intermitentes; metade dos
    // núcleos mantém a suíte rápida e estável (no CI, com menos núcleos, a proporção se mantém).
    maxWorkers: '50%',
    // Testes de integração (jsdom + lazy loading + digitação real) podem passar dos 5 s padrão
    // em máquinas mais lentas ou no CI.
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Fora das métricas: testes, utilitários e fixtures de teste, declarações e a inicialização
      // (main.tsx, App.tsx e router.ts apenas conectam o navegador; cobertos pelos testes E2E).
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/tests/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/App.tsx',
        'src/routes/router.ts',
      ],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
}))
