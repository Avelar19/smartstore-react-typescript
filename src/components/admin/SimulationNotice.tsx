import { Alert } from '@mantine/core'
import { IconFlask } from '@tabler/icons-react'

/** Aviso permanente sobre a natureza demonstrativa do CRUD. */
export function SimulationNotice() {
  return (
    <Alert variant="light" color="yellow" icon={<IconFlask aria-hidden />} title="Modo demonstração" role="note">
      Cadastros, edições e exclusões são enviados à API DummyJSON, que responde como se os gravasse, mas{' '}
      <strong>não persiste nenhuma alteração</strong>. As mudanças aparecem apenas neste painel, durante a
      sessão atual: não alteram o catálogo público e são descartadas ao recarregar a página ou sair.
    </Alert>
  )
}
