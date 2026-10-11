// Convenção monetária: a DummyJSON não define moeda e seus valores são tratados
// como dólares americanos. Exibimos em USD (formato brasileiro), sem conversão para BRL.
const priceFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' })

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
