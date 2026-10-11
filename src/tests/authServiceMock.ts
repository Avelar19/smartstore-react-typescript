import { vi } from 'vitest'

import { ApiError } from '../services/apiError.ts'
import { fetchCurrentUser, login } from '../services/authService.ts'
import { authUserFixture, createTestToken, DEMO_PASSWORD, DEMO_USERNAME } from './fixtures/auth.ts'

export const invalidCredentialsError = new ApiError('http', 'Não foi possível concluir a requisição (erro 400).', {
  status: 400,
  serverMessage: 'Invalid credentials',
})

/**
 * Comportamento determinístico do authService (o arquivo de teste deve chamar
 * `vi.mock('<caminho>/services/authService.ts')`).
 */
export function setupAuthServiceMock(): void {
  vi.mocked(login).mockImplementation(({ username, password }) =>
    username === DEMO_USERNAME && password === DEMO_PASSWORD
      ? Promise.resolve({ accessToken: createTestToken(), user: authUserFixture })
      : Promise.reject(invalidCredentialsError),
  )
  vi.mocked(fetchCurrentUser).mockResolvedValue(authUserFixture)
}
