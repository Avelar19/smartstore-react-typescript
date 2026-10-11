import { Alert, Button, Group, Text } from '@mantine/core'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

interface ErrorStateProps {
  title: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <Alert variant="light" color="red" title={title} icon={<IconAlertTriangle aria-hidden />}>
      <Text size="sm">{message}</Text>
      {onRetry && (
        <Group mt="md">
          <Button
            size="xs"
            variant="white"
            color="red"
            leftSection={<IconRefresh size={14} aria-hidden />}
            onClick={onRetry}
          >
            Tentar novamente
          </Button>
        </Group>
      )}
    </Alert>
  )
}
