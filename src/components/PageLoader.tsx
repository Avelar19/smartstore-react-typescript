import { Center, Loader, Stack, Text } from '@mantine/core'

interface PageLoaderProps {
  label: string
}

/** Indicador de carregamento de página inteira (lazy loading, sessão em validação). */
export function PageLoader({ label }: PageLoaderProps) {
  return (
    <Center py={80}>
      <Stack align="center" gap="sm" role="status">
        <Loader aria-hidden />
        <Text c="dimmed">{label}</Text>
      </Stack>
    </Center>
  )
}
