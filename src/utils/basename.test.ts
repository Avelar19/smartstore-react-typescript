import { describe, expect, it } from 'vitest'

import { getRouterBasename } from './basename.ts'

describe('getRouterBasename', () => {
  it('mantém "/" no ambiente de desenvolvimento', () => {
    expect(getRouterBasename('/')).toBe('/')
  })

  it('remove a barra final da base do GitHub Pages', () => {
    expect(getRouterBasename('/smartstore-react-typescript/')).toBe('/smartstore-react-typescript')
  })

  it('mantém bases já sem barra final', () => {
    expect(getRouterBasename('/smartstore-react-typescript')).toBe('/smartstore-react-typescript')
  })
})
