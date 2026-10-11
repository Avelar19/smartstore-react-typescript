import { describe, expect, it } from 'vitest'

import { formatPrice, formatRating } from './format.ts'

describe('formatadores', () => {
  it('formata preços em dólar (USD) no padrão brasileiro, sem conversão', () => {
    expect(formatPrice(1099.99)).toMatch(/US\$\s1\.099,99/)
  })

  it('formata avaliações com uma casa decimal', () => {
    expect(formatRating(4)).toBe('4,0')
    expect(formatRating(4.56)).toBe('4,6')
  })
})
