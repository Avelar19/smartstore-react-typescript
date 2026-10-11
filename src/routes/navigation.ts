import { IconBuildingStore, IconHome, IconLayoutDashboard, IconLogin } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'

export interface NavigationItem {
  label: string
  to: string
  icon: Icon
  /** Quando true, o link só fica ativo na rota exata. */
  end?: boolean
}

export const publicNavigation: readonly NavigationItem[] = [
  { label: 'Início', to: '/', icon: IconHome, end: true },
  { label: 'Catálogo', to: '/products', icon: IconBuildingStore },
]

export const adminNavigation: NavigationItem = {
  label: 'Painel administrativo',
  to: '/admin',
  icon: IconLayoutDashboard,
}

export const loginNavigation: NavigationItem = {
  label: 'Entrar',
  to: '/login',
  icon: IconLogin,
}
