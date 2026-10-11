import { AppShell, Avatar, Box, Burger, Button, Container, Divider, Group, Loader, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconLogout, IconShoppingBag } from '@tabler/icons-react'
import { Suspense, useCallback, useEffect, useRef } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useMatches, useNavigate } from 'react-router-dom'

import { NavigationLinks } from '../components/NavigationLinks.tsx'
import { PageLoader } from '../components/PageLoader.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import type { AuthUser } from '../schemas/auth.ts'
import { adminNavigation, loginNavigation, publicNavigation } from '../routes/navigation.ts'
import { isProtectedRouteHandle } from '../routes/routeHandles.ts'
import classes from './MainLayout.module.css'

interface UserIdentityProps {
  user: AuthUser
  /** Em telas médias, oculta o nome e mantém só o avatar para economizar espaço no cabeçalho. */
  compact?: boolean
}

function UserIdentity({ user, compact = false }: UserIdentityProps) {
  const fullName = `${user.firstName} ${user.lastName}`
  const name = (
    <Text size="sm" fw={500}>
      {user.firstName}
    </Text>
  )

  return (
    <Group gap="xs" wrap="nowrap" aria-label={`Usuário autenticado: ${fullName}`}>
      <Avatar src={user.image} alt="" size="sm" radius="xl" />
      {compact ? <Box visibleFrom="md">{name}</Box> : name}
    </Group>
  )
}

/** Layout persistente: cabeçalho e menu permanecem; as páginas são renderizadas no Outlet. */
export function MainLayout() {
  const [menuOpened, { toggle: toggleMenu, close: closeMenu }] = useDisclosure(false)
  const { user, status, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isOnProtectedRoute = useMatches().some((match) => isProtectedRouteHandle(match.handle))

  const mobileNavigation = [...publicNavigation, status === 'authenticated' ? adminNavigation : loginNavigation]

  const finishLogout = useCallback(() => {
    logout()
    notifications.show({ id: 'logout', message: 'Você saiu da sua conta.' })
  }, [logout])

  // Logout a partir de uma rota protegida: primeiro sai da rota e só encerra a sessão depois que a
  // nova rota foi renderizada. O React Router aplica a navegação como transition (baixa prioridade);
  // se a sessão terminasse antes, o ProtectedRoute ainda montado redirecionaria para /login.
  const logoutAfterNavigationRef = useRef(false)
  useEffect(() => {
    if (!logoutAfterNavigationRef.current) return
    logoutAfterNavigationRef.current = false
    finishLogout()
  }, [location.key, finishLogout])

  function handleLogout() {
    closeMenu()
    if (isOnProtectedRoute) {
      logoutAfterNavigationRef.current = true
      void navigate('/')
    } else {
      // Em páginas públicas o usuário permanece onde está.
      finishLogout()
    }
  }

  function renderDesktopAuthArea() {
    if (status === 'restoring') {
      return <Loader size="sm" aria-label="Validando sessão" />
    }

    if (status === 'authenticated' && user) {
      return (
        <Group gap="sm" wrap="nowrap">
          <Button
            component={Link}
            to={adminNavigation.to}
            variant="light"
            leftSection={<adminNavigation.icon size={18} stroke={1.6} aria-hidden />}
          >
            {adminNavigation.label}
          </Button>
          <UserIdentity user={user} compact />
          <Button variant="subtle" color="gray" leftSection={<IconLogout size={18} aria-hidden />} onClick={handleLogout}>
            Sair
          </Button>
        </Group>
      )
    }

    return (
      <Button
        component={Link}
        to={loginNavigation.to}
        variant="light"
        leftSection={<loginNavigation.icon size={18} stroke={1.6} aria-hidden />}
      >
        {loginNavigation.label}
      </Button>
    )
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !menuOpened, desktop: true } }}
      padding={0}
    >
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Burger
                opened={menuOpened}
                onClick={toggleMenu}
                hiddenFrom="sm"
                size="sm"
                aria-label={menuOpened ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={menuOpened}
              />
              <Link to="/" className={classes.brand} onClick={closeMenu}>
                <IconShoppingBag className={classes.brandIcon} size={26} stroke={1.8} aria-hidden />
                SmartStore
              </Link>
            </Group>

            <Box visibleFrom="sm">
              <NavigationLinks items={publicNavigation} orientation="horizontal" label="Navegação principal" />
            </Box>

            <Box visibleFrom="sm">{renderDesktopAuthArea()}</Box>

            {/* No celular, só o avatar indica a sessão; as ações ficam no menu. */}
            {status === 'authenticated' && user && (
              <Box hiddenFrom="sm">
                <Avatar src={user.image} alt={`${user.firstName} ${user.lastName}`} size="sm" radius="xl" />
              </Box>
            )}
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {/* Renderizado só quando aberto, para não manter links ocultos acessíveis por teclado. */}
        {menuOpened && (
          <Stack gap="md">
            <NavigationLinks
              items={mobileNavigation}
              orientation="vertical"
              label="Menu móvel"
              onNavigate={closeMenu}
            />
            {status === 'authenticated' && user && (
              <>
                <Divider />
                <UserIdentity user={user} />
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconLogout size={18} aria-hidden />}
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </>
            )}
          </Stack>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl" py="xl">
          <Suspense fallback={<PageLoader label="Carregando página…" />}>
            <Outlet />
          </Suspense>
        </Container>

        <Box component="footer" className={classes.footer}>
          <Container size="xl">
            <Text size="sm" c="dimmed" ta="center">
              SmartStore — projeto acadêmico de pós-graduação. Dados de demonstração da DummyJSON; preços em
              dólares americanos (US$).
            </Text>
          </Container>
        </Box>
      </AppShell.Main>

      <ScrollRestoration />
    </AppShell>
  )
}
