import type { Page, Request, Route } from '@playwright/test'

import { CATEGORY_NAMES, createProducts, E2E_CREDENTIALS, E2E_USER } from './data.ts'
import type { ApiProduct } from './data.ts'
import { createTestJwt } from './jwt.ts'

// PNG 1x1 servido no lugar das imagens do CDN (as imagens carregam de verdade no navegador).
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/** ID que a DummyJSON real devolve para qualquer produto criado em /products/add. */
const CREATED_PRODUCT_ID = 195

export interface RecordedRequest {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
  authorization: string | undefined
}

type JsonBody = Record<string, unknown> | unknown[]

/**
 * Simula a DummyJSON com page.route, preservando os formatos reais das respostas.
 * Como a API real, as escritas não alteram os dados servidos depois (não há persistência).
 */
export class DummyJsonMock {
  readonly requests: RecordedRequest[] = []
  readonly unhandled: string[] = []
  readonly products: readonly ApiProduct[] = createProducts()
  /** Tokens emitidos no login e aceitos em /auth/me. */
  private readonly validTokens = new Set<string>()

  async install(page: Page): Promise<void> {
    await page.route('https://cdn.dummyjson.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
    )
    await page.route('https://dummyjson.com/**', (route, request) => this.handle(route, request))
  }

  /** Emite um token aceito por /auth/me (simula uma sessão já existente). */
  issueToken(expiresInSeconds = 3600): string {
    const token = createTestJwt(expiresInSeconds)
    this.validTokens.add(token)
    return token
  }

  writes(): RecordedRequest[] {
    return this.requests.filter((request) => request.method !== 'GET')
  }

  private async handle(route: Route, request: Request): Promise<void> {
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }

    const url = new URL(request.url())
    const body = parseBody(request.postData())
    this.requests.push({
      method: request.method(),
      path: url.pathname,
      query: url.searchParams,
      body,
      authorization: request.headers()['authorization'],
    })

    const response = this.respond(request.method(), url, body, request.headers()['authorization'])
    if (!response) {
      this.unhandled.push(`${request.method()} ${url.pathname}${url.search}`)
      await route.fulfill({ status: 501, headers: corsHeaders(), json: { message: 'Endpoint não simulado' } })
      return
    }
    await route.fulfill({ status: response.status, headers: corsHeaders(), json: response.json })
  }

  private respond(
    method: string,
    url: URL,
    body: unknown,
    authorization: string | undefined,
  ): { status: number; json: JsonBody } | null {
    const path = url.pathname
    const productMatch = /^\/products\/(\d+)$/.exec(path)
    const categoryMatch = /^\/products\/category\/([^/]+)$/.exec(path)

    if (method === 'POST' && path === '/auth/login') return this.login(body)
    if (method === 'GET' && path === '/auth/me') return this.me(authorization)

    if (method === 'GET' && path === '/products') return { status: 200, json: this.page(this.sorted(url), url) }
    if (method === 'GET' && path === '/products/search') {
      const term = (url.searchParams.get('q') ?? '').toLowerCase()
      const matches = this.products.filter((product) =>
        `${product.title} ${product.description}`.toLowerCase().includes(term),
      )
      return { status: 200, json: this.page(matches, url) }
    }
    if (method === 'GET' && categoryMatch) {
      const slug = decodeURIComponent(categoryMatch[1] ?? '')
      return { status: 200, json: this.page(this.products.filter((product) => product.category === slug), url) }
    }
    if (method === 'GET' && path === '/products/categories') {
      const slugs = [...new Set(this.products.map((product) => product.category))]
      return {
        status: 200,
        json: slugs.map((slug) => ({
          slug,
          name: CATEGORY_NAMES[slug] ?? slug,
          url: `https://dummyjson.com/products/category/${slug}`,
        })),
      }
    }

    if (method === 'POST' && path === '/products/add') {
      return { status: 201, json: { id: CREATED_PRODUCT_ID, ...asRecord(body) } }
    }

    if (productMatch) {
      const id = Number(productMatch[1])
      const product = this.products.find((item) => item.id === id)
      if (!product) return { status: 404, json: { message: `Product with id '${id}' not found` } }
      if (method === 'GET') return { status: 200, json: { ...product } }
      if (method === 'PUT') return { status: 200, json: { ...product, ...asRecord(body), id } }
      if (method === 'DELETE') {
        return { status: 200, json: { ...product, isDeleted: true, deletedOn: new Date().toISOString() } }
      }
    }

    return null
  }

  private login(body: unknown): { status: number; json: JsonBody } {
    const { username, password } = asRecord(body)
    if (!username || !password) return { status: 400, json: { message: 'Username and password required' } }
    if (username !== E2E_CREDENTIALS.username || password !== E2E_CREDENTIALS.password) {
      return { status: 400, json: { message: 'Invalid credentials' } }
    }
    const accessToken = this.issueToken()
    return { status: 200, json: { ...E2E_USER, accessToken, refreshToken: createTestJwt(86_400) } }
  }

  private me(authorization: string | undefined): { status: number; json: JsonBody } {
    const token = authorization?.replace(/^Bearer /, '')
    if (!token) return { status: 401, json: { message: 'Access Token is required' } }
    if (!this.validTokens.has(token)) return { status: 500, json: { message: 'invalid token' } }
    // Como na API real, /auth/me inclui dados sensíveis que a aplicação deve descartar.
    return { status: 200, json: { ...E2E_USER, role: 'admin', password: 'nao-deve-ser-guardada', ssn: '000-00-0000' } }
  }

  private sorted(url: URL): ApiProduct[] {
    const sortBy = url.searchParams.get('sortBy')
    if (sortBy !== 'rating') return [...this.products]
    const direction = url.searchParams.get('order') === 'desc' ? -1 : 1
    return [...this.products].sort((a, b) => direction * (a.rating - b.rating))
  }

  /** Paginação e `select` com a mesma semântica da API real (limit=0 devolve tudo). */
  private page(items: readonly ApiProduct[], url: URL): Record<string, unknown> {
    const limitParam = Number(url.searchParams.get('limit') ?? 30)
    const skip = Number(url.searchParams.get('skip') ?? 0)
    const limit = limitParam === 0 ? items.length : limitParam
    const selected = url.searchParams.get('select')?.split(',')
    const pageItems = items.slice(skip, skip + limit).map((product) =>
      selected ? pick(product, ['id', ...selected]) : product,
    )
    return { products: pageItems, total: items.length, skip, limit: pageItems.length }
  }
}

function pick(product: ApiProduct, keys: readonly string[]): Record<string, unknown> {
  const entries = Object.entries(product).filter(([key]) => keys.includes(key))
  return Object.fromEntries(entries)
}

function parseBody(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? { ...value } : {}
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  }
}
