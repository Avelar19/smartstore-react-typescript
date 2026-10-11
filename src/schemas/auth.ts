import { z } from 'zod'

/** Formulário de login (validado no navegador com zod4Resolver). */
export const loginFormSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.').max(64, 'O usuário deve ter no máximo 64 caracteres.'),
  password: z.string().min(1, 'Informe a senha.').max(128, 'A senha deve ter no máximo 128 caracteres.'),
})

/**
 * Usuário autenticado. Apenas os campos exibidos são mantidos: o Zod descarta o restante
 * (GET /auth/me devolve dados sensíveis de demonstração, como `password`, que nunca são guardados).
 */
export const authUserSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().min(1),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  image: z.string(),
  // Presente em /auth/me, ausente na resposta de /auth/login.
  role: z.string().optional(),
})

/** Resposta de POST /auth/login: dados do usuário + accessToken e refreshToken. */
export const loginResponseSchema = authUserSchema.extend({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})

/** Claims do JWT usadas pelo cliente (apenas a expiração). */
export const jwtPayloadSchema = z.object({
  exp: z.number().int().positive(),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
export type AuthUser = z.infer<typeof authUserSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
