import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconLock } from '@tabler/icons-react'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { PageLoader } from '../components/PageLoader.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { loginFormSchema } from '../schemas/auth.ts'
import type { LoginFormValues } from '../schemas/auth.ts'
import { getRedirectPath, hasRedirectState } from '../utils/redirect.ts'

const DUMMYJSON_AUTH_DOCS_URL = 'https://dummyjson.com/docs/auth'

export function LoginPage() {
  useDocumentTitle('Entrar')

  const { status, login, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = getRedirectPath(location.state)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<LoginFormValues>({
    initialValues: { username: '', password: '' },
    validate: zod4Resolver(loginFormSchema),
  })

  // Ao sair da página, descarta a mensagem de erro do último login.
  useEffect(() => clearError, [clearError])

  async function handleSubmit(values: LoginFormValues) {
    setIsSubmitting(true)
    const success = await login({ username: values.username.trim(), password: values.password })

    if (success) {
      notifications.show({ id: 'login-success', color: 'teal', message: 'Login realizado com sucesso.' })
      void navigate(redirectPath, { replace: true })
      return
    }

    setIsSubmitting(false)
  }

  if (status === 'restoring') {
    return <PageLoader label="Validando sua sessão…" />
  }

  // Usuário que já está autenticado não precisa ver o formulário.
  if (status === 'authenticated' && !isSubmitting) {
    return <Navigate to={redirectPath} replace />
  }

  return (
    <Paper withBorder shadow="sm" radius="lg" p={{ base: 'lg', sm: 'xl' }} maw={440} mx="auto" my="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1} size="h2">
            Entrar
          </Title>
          <Text c="dimmed" size="sm">
            Acesse a área administrativa da SmartStore.
          </Text>
        </Stack>

        {hasRedirectState(location.state) && (
          <Alert variant="light" color="indigo" icon={<IconLock aria-hidden />}>
            Faça login para acessar a área administrativa.
          </Alert>
        )}

        {error && (
          <Alert variant="light" color="red" icon={<IconAlertTriangle aria-hidden />} title="Não foi possível entrar">
            {error}
          </Alert>
        )}

        <form
          noValidate
          onSubmit={form.onSubmit((values) => {
            void handleSubmit(values)
          })}
        >
          <Stack gap="md">
            <TextInput
              label="Usuário"
              autoComplete="username"
              disabled={isSubmitting}
              key={form.key('username')}
              {...form.getInputProps('username')}
            />
            <PasswordInput
              label="Senha"
              autoComplete="current-password"
              disabled={isSubmitting}
              key={form.key('password')}
              {...form.getInputProps('password')}
            />
            <Button type="submit" fullWidth loading={isSubmitting}>
              Entrar
            </Button>
          </Stack>
        </form>

        <Text size="xs" c="dimmed">
          Demonstração: use um usuário público da DummyJSON, como <strong>emilys</strong> com a senha{' '}
          <strong>emilyspass</strong> (
          <Anchor href={DUMMYJSON_AUTH_DOCS_URL} target="_blank" rel="noreferrer" size="xs">
            documentação oficial
          </Anchor>
          ).
        </Text>
      </Stack>
    </Paper>
  )
}
