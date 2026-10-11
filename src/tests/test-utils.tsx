import { render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import { AppProviders } from '../components/AppProviders.tsx'
import { routes } from '../routes/routes.tsx'

interface TestProvidersProps {
  children: ReactNode
}

export function TestProviders({ children }: TestProvidersProps) {
  return <AppProviders env="test">{children}</AppProviders>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: TestProviders, ...options })
}

interface RenderRouteResult extends RenderResult {
  user: UserEvent
  router: ReturnType<typeof createMemoryRouter>
}

type InitialEntry = string | { pathname: string; search?: string; state?: unknown }

/** Renderiza a aplicação completa em memória, iniciando na rota informada. */
export function renderRoute(initialEntry: InitialEntry): RenderRouteResult {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] })
  const user = userEvent.setup()
  const result = renderWithProviders(<RouterProvider router={router} />)

  return { ...result, user, router }
}
