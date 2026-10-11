import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'

import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')

  return (
    <Stack align="center" gap="md" py={64} ta="center">
      <Text fz={96} fw={900} c="indigo" lh={1} aria-hidden>
        404
      </Text>
      <Title order={1}>Página não encontrada</Title>
      <Text c="dimmed" maw={480}>
        O endereço acessado não existe ou foi movido. Verifique o link ou volte para uma das páginas
        abaixo.
      </Text>
      <Group justify="center">
        <Button component={Link} to="/">
          Ir para o início
        </Button>
        <Button component={Link} to="/products" variant="default">
          Ver catálogo
        </Button>
      </Group>
    </Stack>
  )
}
