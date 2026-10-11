import type { Category, CategoryOption } from '../types/product.ts'

/** Tradução centralizada das categorias da DummyJSON (o slug original é mantido nas requisições). */
const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  beauty: 'Beleza',
  fragrances: 'Perfumes',
  furniture: 'Móveis',
  groceries: 'Mercado',
  'home-decoration': 'Decoração',
  'kitchen-accessories': 'Utensílios de cozinha',
  laptops: 'Notebooks',
  'mens-shirts': 'Camisas masculinas',
  'mens-shoes': 'Calçados masculinos',
  'mens-watches': 'Relógios masculinos',
  'mobile-accessories': 'Acessórios para celular',
  motorcycle: 'Motocicletas',
  'skin-care': 'Cuidados com a pele',
  smartphones: 'Smartphones',
  'sports-accessories': 'Artigos esportivos',
  sunglasses: 'Óculos de sol',
  tablets: 'Tablets',
  tops: 'Blusas',
  vehicle: 'Veículos',
  'womens-bags': 'Bolsas femininas',
  'womens-dresses': 'Vestidos',
  'womens-jewellery': 'Joias femininas',
  'womens-shoes': 'Calçados femininos',
  'womens-watches': 'Relógios femininos',
}

/** Converte um slug desconhecido em rótulo legível: "new-category" → "New Category". */
function formatSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getCategoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? formatSlug(slug)
}

export function toCategoryOptions(categories: readonly Category[]): CategoryOption[] {
  return categories
    .map((category) => ({ value: category.slug, label: getCategoryLabel(category.slug) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
}
