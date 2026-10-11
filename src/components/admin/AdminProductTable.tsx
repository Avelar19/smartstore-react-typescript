import { ActionIcon, Avatar, Badge, Group, Table, Text } from '@mantine/core'
import { IconPencil, IconPhoto, IconTrash } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import type { AdminProductRow, AdminProductStatus } from '../../types/admin.ts'
import { getCategoryLabel } from '../../utils/categories.ts'
import { formatPrice } from '../../utils/format.ts'
import { toRefParam } from '../../utils/productRef.ts'

const STATUS_BADGES: Record<Exclude<AdminProductStatus, 'original'>, { label: string; color: string }> = {
  edited: { label: 'Editado', color: 'blue' },
  created: { label: 'Novo (local)', color: 'grape' },
}

interface AdminProductTableProps {
  rows: readonly AdminProductRow[]
  /** Rótulo acessível da tabela. */
  label: string
  onDelete: (row: AdminProductRow) => void
}

export function AdminProductTable({ rows, label, onDelete }: AdminProductTableProps) {
  return (
    // Em telas estreitas a tabela rola horizontalmente, mantendo as colunas legíveis.
    <Table.ScrollContainer minWidth={720}>
      <Table striped highlightOnHover verticalSpacing="sm" aria-label={label}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Produto</Table.Th>
            <Table.Th>Categoria</Table.Th>
            <Table.Th ta="right">Preço</Table.Th>
            <Table.Th ta="right">Estoque</Table.Th>
            <Table.Th ta="right">Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const badge = row.status === 'original' ? null : STATUS_BADGES[row.status]
            return (
              <Table.Tr key={row.key}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar src={row.thumbnail || null} alt="" radius="sm" size="md">
                      <IconPhoto size={18} aria-hidden />
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {row.title}
                      </Text>
                      {badge && (
                        <Badge size="xs" variant="light" color={badge.color}>
                          {badge.label}
                        </Badge>
                      )}
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>{getCategoryLabel(row.category)}</Table.Td>
                <Table.Td ta="right">{formatPrice(row.price)}</Table.Td>
                <Table.Td ta="right">
                  {row.stock > 0 ? (
                    row.stock
                  ) : (
                    <Badge color="red" variant="light">
                      Esgotado
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <ActionIcon
                      component={Link}
                      to={`/admin/products/${toRefParam(row.ref)}/edit`}
                      variant="subtle"
                      aria-label={`Editar ${row.title}`}
                    >
                      <IconPencil size={18} aria-hidden />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={`Excluir ${row.title}`}
                      onClick={() => onDelete(row)}
                    >
                      <IconTrash size={18} aria-hidden />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
