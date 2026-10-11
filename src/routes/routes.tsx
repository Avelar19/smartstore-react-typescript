import type { RouteObject } from 'react-router-dom'

import { MainLayout } from '../layouts/MainLayout.tsx'
import { HomePage } from '../pages/HomePage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import {
  AdminDashboardPage,
  AdminLayout,
  AdminProductCreatePage,
  AdminProductEditPage,
  AdminProductsPage,
  CatalogPage,
  LoginPage,
  ProductDetailsPage,
} from './lazyPages.ts'
import { ProtectedRoute } from './ProtectedRoute.tsx'
import { protectedRouteHandle } from './routeHandles.ts'

/** Definição declarativa das rotas, compartilhada pela aplicação e pelos testes. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <CatalogPage /> },
      { path: 'products/:id', element: <ProductDetailsPage /> },
      { path: 'login', element: <LoginPage /> },
      {
        // Rotas administrativas: novas páginas protegidas entram como filhas deste nó.
        element: <ProtectedRoute />,
        handle: protectedRouteHandle,
        children: [
          {
            path: 'admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'products', element: <AdminProductsPage /> },
              { path: 'products/new', element: <AdminProductCreatePage /> },
              { path: 'products/:productRef/edit', element: <AdminProductEditPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
