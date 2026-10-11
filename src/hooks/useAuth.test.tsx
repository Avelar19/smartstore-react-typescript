import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useAuth } from './useAuth.ts'

describe('useAuth', () => {
  it('lança erro descritivo quando usado fora do AuthProvider', () => {
    // O React registra o erro no console; silenciado para manter a saída limpa.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => renderHook(() => useAuth())).toThrow(/useAuth deve ser usado dentro de <AuthProvider>/)
  })
})
