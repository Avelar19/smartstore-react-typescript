import { describe, expect, it } from 'vitest'

import { formatPrice, formatRating } from './format.ts'

describe('formatadores', () => {
  it('exibe preços em reais (BRL) no padrão brasileiro', () => {
    expect(formatPrice(1099.99)).toMatch(/^R\$\s1\.099,99$/)
  })

  it.each([
    [0.99, 'R$ 0,99'],
    [9.99, 'R$ 9,99'],
    [1099.99, 'R$ 1.099,99'],
    [1999.99, 'R$ 1.999,99'],
    [1299.9, 'R$ 1.299,90'],
  ])('não converte valores: %d → %s (mesmos dígitos recebidos da API)', (value, expected) => {
    // O Intl usa espaço não separável entre o símbolo e o número.
    expect(formatPrice(value).replace(/\s/g, ' ')).toBe(expected)
  })

  it('não modifica o número recebido', () => {
    const price = 1099.99
    formatPrice(price)
    expect(price).toBe(1099.99)
  })

  it('formata avaliações com uma casa decimal', () => {
    expect(formatRating(4)).toBe('4,0')
    expect(formatRating(4.56)).toBe('4,6')
  })
})
