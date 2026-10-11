import { describe, expect, it } from 'vitest'

import { parseRefParam, refKey, toRefParam } from './productRef.ts'

describe('productRef', () => {
  it('converte referências para a URL e de volta', () => {
    expect(toRefParam({ kind: 'api', id: 12 })).toBe('12')
    expect(toRefParam({ kind: 'local', localId: 3 })).toBe('local-3')
    expect(parseRefParam('12')).toEqual({ kind: 'api', id: 12 })
    expect(parseRefParam('local-3')).toEqual({ kind: 'local', localId: 3 })
  })

  it.each([undefined, '', 'abc', '0', '-1', '1.5', 'local-', 'local-x', 'local-0'])('rejeita "%s"', (param) => {
    expect(parseRefParam(param)).toBeNull()
  })

  it('gera chaves distintas para produto da API e local com o mesmo número', () => {
    expect(refKey({ kind: 'api', id: 1 })).not.toBe(refKey({ kind: 'local', localId: 1 }))
  })
})
