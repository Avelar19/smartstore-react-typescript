import { createBrowserRouter } from 'react-router-dom'

import { getRouterBasename } from '../utils/basename.ts'
import { routes } from './routes.tsx'

// Em desenvolvimento BASE_URL é "/"; no build, "/smartstore-react-typescript/" (vite.config.ts).
export const router = createBrowserRouter(routes, {
  basename: getRouterBasename(import.meta.env.BASE_URL),
})
