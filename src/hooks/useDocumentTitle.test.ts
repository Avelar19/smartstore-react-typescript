import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useDocumentTitle } from './useDocumentTitle.ts'

describe('useDocumentTitle', () => {
  it('define o título da página e o restaura ao desmontar (cleanup)', () => {
    document.title = 'Original'

    const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Catálogo' },
    })
    expect(document.title).toBe('Catálogo | SmartStore')

    rerender({ title: 'Detalhes' })
    expect(document.title).toBe('Detalhes | SmartStore')

    unmount()
    expect(document.title).toBe('Original')
  })
})
