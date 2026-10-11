import { Group, Stack, Text, Title } from '@mantine/core'
import type { TitleOrder } from '@mantine/core'
import type { ReactNode } from 'react'

interface PageSectionProps {
  title: string
  description?: string
  actions?: ReactNode
  titleOrder?: TitleOrder
  children: ReactNode
}

/** Seção com título, descrição e ações opcionais; o conteúdo é recebido via children. */
export function PageSection({ title, description, actions, titleOrder = 2, children }: PageSectionProps) {
  return (
    <Stack component="section" gap="lg">
      <Group justify="space-between" align="flex-end" gap="sm">
        <Stack gap={4}>
          <Title order={titleOrder}>{title}</Title>
          {description && <Text c="dimmed">{description}</Text>}
        </Stack>
        {actions}
      </Group>
      {children}
    </Stack>
  )
}
