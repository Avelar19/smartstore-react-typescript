import { describe, expect, it } from 'vitest'

import { getCategoryLabel, toCategoryOptions } from './categories.ts'

describe('categorias', () => {
  it.each([
    ['smartphones', 'Smartphones'],
    ['laptops', 'Notebooks'],
    ['fragrances', 'Perfumes'],
    ['groceries', 'Mercado'],
  ])('traduz %s para %s', (slug, label) => {
    expect(getCategoryLabel(slug)).toBe(label)
  })

  it('usa fallback legível para categorias desconhecidas', () => {
    expect(getCategoryLabel('smart-home-devices')).toBe('Smart Home Devices')
  })

  it('preserva o slug original e ordena as opções pelo rótulo em português', () => {
    const options = toCategoryOptions([
      { slug: 'laptops', name: 'Laptops' },
      { slug: 'beauty', name: 'Beauty' },
      { slug: 'fragrances', name: 'Fragrances' },
    ])

    expect(options).toEqual([
      { value: 'beauty', label: 'Beleza' },
      { value: 'laptops', label: 'Notebooks' },
      { value: 'fragrances', label: 'Perfumes' },
    ])
  })
})
