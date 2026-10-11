import { Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconMoodEmpty } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  /** Ações exibidas abaixo da mensagem (ex.: botões). */
  children?: ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <Stack align="center" gap="sm" py="xl" ta="center">
      <ThemeIcon size={56} radius="xl" variant="light" color="gray">
        <IconMoodEmpty size={32} stroke={1.5} aria-hidden />
      </ThemeIcon>
      <Title order={2} size="h3">
        {title}
      </Title>
      {description && (
        <Text c="dimmed" maw={480}>
          {description}
        </Text>
      )}
      {children}
    </Stack>
  )
}
