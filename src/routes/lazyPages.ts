import { lazy } from 'react'

// Páginas carregadas sob demanda (React.lazy + Suspense no MainLayout/AdminLayout). A Home,
// porta de entrada mais comum, e a 404 ficam no bundle inicial.
export const CatalogPage = lazy(() =>
  import('../pages/CatalogPage.tsx').then((module) => ({ default: module.CatalogPage })),
)
export const ProductDetailsPage = lazy(() =>
  import('../pages/ProductDetailsPage.tsx').then((module) => ({ default: module.ProductDetailsPage })),
)
export const LoginPage = lazy(() => import('../pages/LoginPage.tsx').then((module) => ({ default: module.LoginPage })))

export const AdminLayout = lazy(() =>
  import('../layouts/AdminLayout.tsx').then((module) => ({ default: module.AdminLayout })),
)
export const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage.tsx').then((module) => ({ default: module.AdminDashboardPage })),
)
export const AdminProductsPage = lazy(() =>
  import('../pages/admin/AdminProductsPage.tsx').then((module) => ({ default: module.AdminProductsPage })),
)
export const AdminProductCreatePage = lazy(() =>
  import('../pages/admin/AdminProductCreatePage.tsx').then((module) => ({ default: module.AdminProductCreatePage })),
)
export const AdminProductEditPage = lazy(() =>
  import('../pages/admin/AdminProductEditPage.tsx').then((module) => ({ default: module.AdminProductEditPage })),
)
