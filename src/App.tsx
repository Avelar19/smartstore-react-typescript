import { RouterProvider } from 'react-router-dom'

import { AppProviders } from './components/AppProviders.tsx'
import { router } from './routes/router.ts'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
