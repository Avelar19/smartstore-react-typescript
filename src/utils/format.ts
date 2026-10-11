// Convenção monetária: os valores da DummyJSON são DEMONSTRATIVOS e exibidos em reais (R$)
// exatamente como recebidos, SEM conversão cambial (1099.99 → "R$ 1.099,99"). Apenas a
// apresentação muda; os números recebidos e enviados à API permanecem os mesmos.
const priceFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ratingFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatPrice(value: number): string {
  return priceFormatter.format(value)
}

export function formatRating(value: number): string {
  return ratingFormatter.format(value)
}
