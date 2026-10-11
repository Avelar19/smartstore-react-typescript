import '@testing-library/jest-dom/vitest'

import { notifications } from '@mantine/notifications'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { api } from '../services/api.ts'

// Barreira de rede: nenhum teste pode acessar a DummyJSON real. Requisições que não foram
// mockadas (mockApiAdapter ou vi.mock dos serviços) falham imediatamente com mensagem clara.
api.defaults.adapter = (config) =>
  Promise.reject(new Error(`Requisição de rede não mockada no teste: ${config.method?.toUpperCase()} ${config.url}`))

// Com muitos arquivos em paralelo (jsdom), debounce real e lazy loading podem atrasar
// a renderização em máquinas com pouca CPU livre; o padrão de 1 s gera falsos negativos.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  // Isola os testes: sessão salva e notificações (deduplicadas por id) não vazam entre eles.
  sessionStorage.clear()
  localStorage.clear()
  notifications.clean()
  // Garante timers reais mesmo se um teste com fake timers falhar antes de restaurá-los.
  vi.useRealTimers()
})

// APIs de navegador usadas pelo Mantine que não existem no jsdom.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

window.ResizeObserver = ResizeObserverMock
window.HTMLElement.prototype.scrollIntoView = vi.fn()
Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() })

// Font Loading API (document.fonts), usada pelo Textarea com autosize do Mantine.
Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: { addEventListener: vi.fn(), removeEventListener: vi.fn(), ready: Promise.resolve() },
})
