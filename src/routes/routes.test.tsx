import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setupProductServiceMock } from '../tests/productServiceMock.ts'
import { renderRoute } from '../tests/test-utils.tsx'

vi.mock('../services/productService.ts')

beforeEach(() => {
  setupProductServiceMock()
})

function getMainNavigation() {
  return screen.getByRole('navigation', { name: 'Navegação principal' })
}

describe('Rotas e navegação', () => {
  it('renderiza a Home dentro do layout persistente', async () => {
    renderRoute('/')

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'SmartStore' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tecnologia, beleza e casa em um só lugar' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Produtos em destaque' })).toBeInTheDocument()
    expect(within(getMainNavigation()).getByRole('link', { name: 'Início' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await screen.findAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it('navega da Home para o catálogo e marca o link ativo', async () => {
    const { user, router } = renderRoute('/')
    const navigation = getMainNavigation()

    await user.click(within(navigation).getByRole('link', { name: 'Catálogo' }))

    expect(router.state.location.pathname).toBe('/products')
    expect(await screen.findByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current')
  })

  it('abre os detalhes a partir do catálogo e volta preservando os filtros', async () => {
    const { user, router } = renderRoute('/products?category=laptops')

    await user.click(await screen.findByRole('link', { name: 'Ver detalhes de Dell XPS 13' }))

    expect(router.state.location.pathname).toBe('/products/6')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dell XPS 13' })).toBeInTheDocument()
    expect(within(getMainNavigation()).getByRole('link', { name: 'Catálogo' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(router.state.location.pathname).toBe('/products')
    expect(router.state.location.search).toBe('?category=laptops')
    expect(await screen.findByText('3 produtos encontrados em Notebooks')).toBeInTheDocument()
  })

  it('no acesso direto aos detalhes, "Voltar" leva ao catálogo', async () => {
    const { user, router } = renderRoute('/products/4')

    await user.click(await screen.findByRole('button', { name: 'Voltar' }))

    expect(router.state.location.pathname).toBe('/products')
  })

  it('exibe a página 404 para rotas inexistentes', () => {
    renderRoute('/rota/que/nao/existe')

    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('sem sessão, o cabeçalho oferece "Entrar" e leva ao login', async () => {
    const { user, router } = renderRoute('/')

    await user.click(screen.getByRole('link', { name: 'Entrar' }))

    expect(router.state.location.pathname).toBe('/login')
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
  })

  it('abre o menu móvel e o fecha ao navegar', async () => {
    const { user, router } = renderRoute('/')

    expect(screen.queryByRole('navigation', { name: 'Menu móvel' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const mobileMenu = screen.getByRole('navigation', { name: 'Menu móvel' })
    await user.click(within(mobileMenu).getByRole('link', { name: 'Catálogo' }))

    expect(router.state.location.pathname).toBe('/products')
    expect(screen.queryByRole('navigation', { name: 'Menu móvel' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  })
})
