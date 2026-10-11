import { Stack } from '@mantine/core'
import { IconLayoutDashboard, IconPackage } from '@tabler/icons-react'
import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { SimulationNotice } from '../components/admin/SimulationNotice.tsx'
import { NavigationLinks } from '../components/NavigationLinks.tsx'
import { PageLoader } from '../components/PageLoader.tsx'
import type { NavigationItem } from '../routes/navigation.ts'

const adminSections: readonly NavigationItem[] = [
  { label: 'Visão geral', to: '/admin', icon: IconLayoutDashboard, end: true },
  { label: 'Produtos', to: '/admin/products', icon: IconPackage },
]

/** Layout compartilhado da área administrativa (protegida pelo ProtectedRoute). */
export function AdminLayout() {
  return (
    <Stack gap="lg">
      <NavigationLinks items={adminSections} orientation="horizontal" label="Navegação administrativa" />
      <SimulationNotice />
      <Suspense fallback={<PageLoader label="Carregando página…" />}>
        <Outlet />
      </Suspense>
    </Stack>
  )
}
