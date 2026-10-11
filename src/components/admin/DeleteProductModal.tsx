import { Button, Group, Modal, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import type { AdminProductRow } from '../../types/admin.ts'

interface DeleteProductModalProps {
  /** Produto a excluir; `null` mantém o modal fechado. */
  product: AdminProductRow | null
  onCancel: () => void
  /** Deve rejeitar em caso de falha (o modal permanece aberto para nova tentativa). */
  onConfirm: (product: AdminProductRow) => Promise<void>
}

/** Confirmação obrigatória antes de excluir. */
export function DeleteProductModal({ product, onCancel, onConfirm }: DeleteProductModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    if (!product || isDeleting) return
    setIsDeleting(true)
    try {
      await onConfirm(product)
    } catch {
      // Erro notificado pela página; o modal continua aberto.
    }
    setIsDeleting(false)
  }

  return (
    <Modal
      opened={product !== null}
      onClose={onCancel}
      title="Excluir produto"
      centered
      closeOnClickOutside={!isDeleting}
      closeOnEscape={!isDeleting}
      withCloseButton={!isDeleting}
    >
      <Stack gap="lg">
        <Text size="sm">
          Tem certeza de que deseja excluir <strong>{product?.title}</strong>? A exclusão é simulada: a
          DummyJSON confirma a operação, mas o produto continua existindo na API.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button color="red" loading={isDeleting} onClick={() => void handleConfirm()}>
            Excluir
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
