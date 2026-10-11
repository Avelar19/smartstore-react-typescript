import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import type { ReactNode } from 'react'

import { AuthProvider } from '../contexts/AuthProvider.tsx'
import { ProductChangesProvider } from '../contexts/ProductChangesProvider.tsx'
import { theme } from '../theme.ts'

interface AppProvidersProps {
  children: ReactNode
  /** "test" desativa transições e portais do Mantine (usado nos testes). */
  env?: 'default' | 'test'
}

/** Agrupa os provedores globais da aplicação (composição com children). */
export function AppProviders({ children, env = 'default' }: AppProvidersProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light" env={env}>
      <Notifications position="top-right" />
      <AuthProvider>
        <ProductChangesProvider>{children}</ProductChangesProvider>
      </AuthProvider>
    </MantineProvider>
  )
}
