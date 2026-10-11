import { notifications } from '@mantine/notifications'

import { toApiError } from '../services/apiError.ts'

const ADMIN_ERROR_ID = 'admin-product-error'

/**
 * Notifica falhas das operações administrativas. Um 401 não gera mensagem aqui: o AuthProvider
 * já encerra a sessão e avisa o usuário (evita notificações duplicadas).
 */
export function notifyAdminError(title: string, error: unknown): void {
  const apiError = toApiError(error)
  if (apiError.status === 401) return

  // Mantém uma única notificação de erro visível, sempre com a mensagem mais recente.
  notifications.hide(ADMIN_ERROR_ID)
  notifications.show({ id: ADMIN_ERROR_ID, color: 'red', title, message: apiError.message })
}

export function notifyAdminSuccess(message: string): void {
  notifications.show({ color: 'teal', title: 'Operação simulada concluída', message })
}
