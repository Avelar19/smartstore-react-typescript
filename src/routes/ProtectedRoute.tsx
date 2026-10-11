import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { PageLoader } from '../components/PageLoader.tsx'
import { useAuth } from '../hooks/useAuth.ts'

/**
 * Protege as rotas filhas (área administrativa) na interface.
 * Observação: é uma proteção de navegação no navegador; a autorização real de dados
 * deve sempre ser garantida pelo backend.
 */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') {
    return <PageLoader label="Validando sua sessão…" />
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
