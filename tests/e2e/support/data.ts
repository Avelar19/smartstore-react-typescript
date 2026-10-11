// Dados determinísticos no formato real da DummyJSON (inclui campos que a aplicação descarta).

export interface ApiProduct {
  id: number
  title: string
  description: string
  category: string
  price: number
  discountPercentage: number
  rating: number
  stock: number
  tags: string[]
  brand?: string
  sku: string
  weight: number
  warrantyInformation: string
  shippingInformation: string
  availabilityStatus: string
  returnPolicy: string
  reviews: { rating: number; comment: string; reviewerName: string }[]
  images: string[]
  thumbnail: string
}

const CDN = 'https://cdn.dummyjson.com/product-images'

interface ProductSeed {
  title: string
  description: string
  category: string
  price: number
  rating: number
  stock: number
  brand?: string
  imageCount?: number
}

const seeds: ProductSeed[] = [
  { title: 'Essence Mascara Lash Princess', description: 'Popular mascara with volumizing effect.', category: 'beauty', price: 9.99, rating: 2.56, stock: 99, brand: 'Essence', imageCount: 2 },
  { title: 'Eyeshadow Palette with Mirror', description: 'Versatile palette with a built-in mirror.', category: 'beauty', price: 19.99, rating: 2.86, stock: 34, brand: 'Glamour Beauty' },
  { title: 'Calvin Klein CK One', description: 'Classic unisex fragrance.', category: 'fragrances', price: 49.99, rating: 4.37, stock: 29, brand: 'Calvin Klein' },
  { title: 'Chanel Coco Noir Eau De', description: 'Elegant fragrance with rose notes.', category: 'fragrances', price: 129.99, rating: 4.26, stock: 58, brand: 'Chanel' },
  { title: 'Apple MacBook Pro 14 Inch Space Grey', description: 'Laptop powered by the M1 Pro chip.', category: 'laptops', price: 1999.99, rating: 3.65, stock: 24, brand: 'Apple', imageCount: 3 },
  { title: 'Asus Zenbook Pro Dual Screen Laptop', description: 'Laptop with a secondary touchscreen.', category: 'laptops', price: 1799.99, rating: 3.95, stock: 45, brand: 'Asus' },
  { title: 'Lenovo Yoga 920', description: '2-in-1 convertible laptop.', category: 'laptops', price: 1099.99, rating: 2.86, stock: 0, brand: 'Lenovo' },
  { title: 'iPhone 13 Pro', description: 'Smartphone with ProMotion display.', category: 'smartphones', price: 1099.99, rating: 4.12, stock: 56, brand: 'Apple', imageCount: 2 },
  { title: 'Samsung Galaxy S10', description: 'Android smartphone with Infinity-O display.', category: 'smartphones', price: 699.99, rating: 3.82, stock: 19, brand: 'Samsung' },
  { title: 'Oppo A57', description: 'Budget smartphone with fast charging.', category: 'smartphones', price: 249.99, rating: 4.39, stock: 7, brand: 'Oppo' },
  { title: 'Apple', description: 'Fresh and crisp apples.', category: 'groceries', price: 1.99, rating: 4.19, stock: 9 },
  { title: 'Water', description: 'Bottled mineral water.', category: 'groceries', price: 0.99, rating: 4.96, stock: 20 },
]

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function createProducts(): ApiProduct[] {
  return seeds.map((seed, index) => {
    const base = `${CDN}/${seed.category}/${slugify(seed.title)}`
    return {
      id: index + 1,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      price: seed.price,
      discountPercentage: 10.5,
      rating: seed.rating,
      stock: seed.stock,
      tags: [seed.category],
      ...(seed.brand && { brand: seed.brand }),
      sku: `SKU-${index + 1}`,
      weight: 3,
      warrantyInformation: '1 year warranty',
      shippingInformation: 'Ships in 1 week',
      availabilityStatus: seed.stock > 0 ? 'In Stock' : 'Out of Stock',
      returnPolicy: '30 days return policy',
      reviews: [{ rating: 5, comment: 'Great!', reviewerName: 'Revisor de Teste' }],
      images: Array.from({ length: seed.imageCount ?? 1 }, (_, imageIndex) => `${base}/${imageIndex + 1}.webp`),
      thumbnail: `${base}/thumbnail.webp`,
    }
  })
}

export const CATEGORY_NAMES: Record<string, string> = {
  beauty: 'Beauty',
  fragrances: 'Fragrances',
  laptops: 'Laptops',
  smartphones: 'Smartphones',
  groceries: 'Groceries',
}

// Usuário e credenciais exclusivos dos testes E2E (não são credenciais reais).
export const E2E_CREDENTIALS = { username: 'usuario.e2e', password: 'senha-e2e-123' }

export const E2E_USER = {
  id: 1,
  username: 'usuario.e2e',
  email: 'ana.teste@e2e.example',
  firstName: 'Ana',
  lastName: 'Teste',
  gender: 'female',
  image: 'https://cdn.dummyjson.com/icon/usuario.e2e/128',
}
