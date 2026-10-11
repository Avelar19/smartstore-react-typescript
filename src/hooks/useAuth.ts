import { useContext } from 'react'

import { AuthContext } from '../contexts/authContext.ts'
import type { AuthContextValue } from '../contexts/authContext.ts'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error(
      'useAuth deve ser usado dentro de <AuthProvider>. Envolva a aplicação (ou o componente em teste) com o AuthProvider.',
    )
  }

  return context
}
