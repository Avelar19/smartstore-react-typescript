# SmartStore

> **Aplicação (GitHub Pages):** <https://avelar19.github.io/smartstore-react-typescript/>
>
> **Repositório:** <https://github.com/Avelar19/smartstore-react-typescript>

SmartStore é uma loja virtual desenvolvida como projeto final da disciplina **Aplicação Web Dinâmica e Interativa** (pós-graduação). A aplicação consome a API pública [DummyJSON](https://dummyjson.com) e oferece:

- **Área pública:** página inicial com produtos em destaque, catálogo com busca, filtro por categoria e paginação, e página de detalhes do produto.
- **Área administrativa protegida:** login com JWT, dashboard com indicadores do catálogo e gerenciamento de produtos (cadastro, edição e exclusão **simulados**).

## Tema

Comércio eletrônico. Os dados (produtos, categorias, usuários) vêm da DummyJSON. A interface está em português brasileiro; descrições, tags e políticas dos produtos permanecem em inglês, como são fornecidas pela API.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Base | React 19, TypeScript 6 (modo `strict`), Vite 8 |
| Interface | Mantine 9 (core, form, notifications), CSS Modules, Tabler Icons |
| Rotas | React Router 7 (data router, `basename` para o GitHub Pages) |
| Dados | Axios (instância central com interceptors), Zod 4 (`safeParse`, `z.infer`) |
| Formulários | `@mantine/form` + `mantine-form-zod-resolver` (`zod4Resolver`) |
| Estado global | Context API (`AuthContext`, alterações simuladas do CRUD com `useReducer`) |
| Testes | Vitest 5, React Testing Library, user-event, `@vitest/coverage-v8`, Playwright |
| Qualidade | ESLint 10 + typescript-eslint (regras com verificação de tipos, `no-explicit-any`) |
| CI/CD | GitHub Actions, GitHub Pages |
| Ferramentas | Node.js 24, Yarn Classic 1.22.22 (via Corepack) |

## Instalação e execução

Pré-requisitos: **Node.js 24** (mínimo 22.18) e Corepack, que já vem com o Node.

```bash
corepack enable                   # ativa o Yarn 1.22.22 definido em package.json
yarn install --frozen-lockfile    # instala exatamente as versões do yarn.lock
yarn dev                          # servidor de desenvolvimento em http://localhost:5173/
```

Não há variáveis de ambiente nem credenciais a configurar: a API é pública e a URL `https://dummyjson.com` está centralizada em `src/services/api.ts`.

### Scripts

| Comando | Descrição |
|---|---|
| `yarn dev` | Servidor de desenvolvimento (base `/`) |
| `yarn build` | Typecheck + build de produção em `dist/` (base `/smartstore-react-typescript/`, gera `404.html`) |
| `yarn preview` | Serve o build com o `vite preview` |
| `yarn preview:pages` | Serve o build **como o GitHub Pages** (sem fallback de SPA), em `http://localhost:4173/smartstore-react-typescript/` |
| `yarn typecheck` | Verificação de tipos (aplicação, configs, scripts e testes E2E) |
| `yarn lint` | ESLint |
| `yarn test` | Testes unitários e de integração (Vitest) |
| `yarn test:watch` | Vitest em modo observação |
| `yarn test:coverage` | Testes com relatório de cobertura (`coverage/index.html`) |
| `yarn test:e2e` | Testes ponta a ponta (Playwright). Na primeira execução, instale o navegador com `yarn playwright install chromium` |

## Estrutura

```
src/
  components/   componentes reutilizáveis (cards, estados de erro/vazio, formulário, tabela admin)
  contexts/     AuthProvider, ProductChangesProvider e reducer das alterações simuladas
  hooks/        useAuth, useApiQuery, useDocumentTitle, useProductChanges, useCategoryOptions
  layouts/      MainLayout (AppShell) e AdminLayout
  pages/        páginas públicas e administrativas (carregadas sob demanda)
  routes/       rotas declarativas, ProtectedRoute, navegação
  schemas/      schemas Zod (produtos, autenticação, formulário administrativo)
  services/     api.ts (Axios), productService, authService, adminProductService
  types/        tipos de domínio (inferidos dos schemas)
  utils/        formatação, categorias, JWT, paginação, redirecionamento
  tests/        setup e utilitários do Vitest
tests/e2e/      testes Playwright e simulador da DummyJSON
build/          plugin do Vite que gera o 404.html do GitHub Pages
scripts/        servidor que emula o GitHub Pages
.github/workflows/  CI e deploy
```

## Autenticação

1. O login envia `POST /auth/login` (usuário, senha e `expiresInMins: 60`). A resposta é validada com Zod.
2. Somente o **`accessToken`** é guardado, no `sessionStorage`, e é descartado ao fechar a aba. O `refreshToken` não é armazenado e a senha nunca é gravada no navegador.
3. O interceptor de requisição do Axios adiciona `Authorization: Bearer <token>` quando há sessão.
4. Ao abrir ou recarregar a aplicação com um token salvo, a sessão é validada em `GET /auth/me` antes de liberar a área administrativa; até lá é exibido "Validando sua sessão…". Token vencido (pela claim `exp`) é descartado sem chamar a API. Token recusado pelo servidor (401 "Token Expired!" ou 500 "invalid token") encerra a sessão.
5. A sessão também termina automaticamente no horário de expiração do token. Um HTTP 401 numa requisição feita com o token atual encerra a sessão e mostra **uma única** notificação.
6. `ProtectedRoute` redireciona usuários não autenticados para `/login`, guardando a rota original para retornar após o login.

**Credenciais de demonstração:** a tela de login indica o usuário público da DummyJSON (`emilys` / `emilyspass`), documentado em <https://dummyjson.com/docs/auth>. Essas credenciais são públicas e não dão acesso a nada real.

> **Importante:** esta é uma aplicação demonstrativa. A proteção das rotas acontece **na interface**; em um sistema real, a autorização precisa ser garantida pelo backend.

## Limitações da DummyJSON e CRUD simulado

- **Escritas não são persistidas.** `POST /products/add`, `PUT /products/:id` e `DELETE /products/:id` respondem como se gravassem, mas um novo `GET` devolve os dados originais.
- **Como a aplicação lida com isso:**
  - as alterações confirmadas pela API ficam em memória (Context + `useReducer`) e são aplicadas sobre os dados buscados, para que uma nova busca não as desfaça;
  - elas valem durante a sessão no painel e são descartadas ao recarregar a página ou trocar de usuário;
  - de propósito, o `localStorage` **não** é usado para simular um banco de dados;
  - um aviso permanente no painel explica tudo isso.
- **O catálogo público não reflete as alterações simuladas.** Ele sempre mostra os dados reais da API.
- **Id fixo nos cadastros.** Todo cadastro recebe o id `195` da API, por isso cada produto criado ganha um identificador local próprio (`local-1`, `local-2`…). Esses produtos não existem na API (`PUT`/`DELETE` retornariam 404), então editá-los ou excluí-los é feito apenas no estado local.
- **Busca e categoria não se combinam.** `/products/search` ignora `category` e `/products/category/:slug` ignora `q`. O catálogo trata os dois filtros como exclusivos, para manter a contagem e a paginação corretas.
- **Preços demonstrativos em reais.** A DummyJSON não define moeda. Os valores são **demonstrativos** e exibidos em **reais (R$)** exatamente como recebidos, **sem conversão cambial**: o valor `1099.99` da API aparece como `R$ 1.099,99`. Só a apresentação usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; os números recebidos e os enviados à API (cadastro e edição) não são alterados.

## Testes automatizados

| Tipo | Ferramentas | Quantidade |
|---|---|---|
| Unitários e de integração | Vitest + React Testing Library + user-event | **252 testes** em 32 arquivos |
| Ponta a ponta | Playwright (Chromium headless) | **23 testes** em 6 arquivos |

- **Cobertura** (`yarn test:coverage`): 98,8% das instruções, 96,0% dos ramos, 100% das funções e 99,9% das linhas. Testes, fixtures e os arquivos de inicialização não entram no cálculo.
- **Isolamento dos testes Vitest:**
  - a instância do Axios bloqueia qualquer requisição de rede não simulada;
  - `sessionStorage`, notificações e timers são limpos entre os testes;
  - a suíte passa em ordem aleatória (`--sequence.shuffle`).
- **Testes E2E:**
  - simulam a DummyJSON com `page.route`, preservando os formatos reais das respostas, e rodam a aplicação inteira no navegador (Axios, interceptors, Zod, contextos, rotas);
  - falham se houver erro inesperado no console ou chamada a um endpoint não simulado;
  - rodam contra o build de produção servido **como no GitHub Pages**.
- **Fluxos E2E cobertos:** catálogo, busca e detalhes; login, rota protegida, recarregamento e logout; cadastro com validação; edição e exclusão; sessão expirada; erro da API com nova tentativa; menu móvel; links diretos e recarregamento no GitHub Pages.

## CI/CD e GitHub Pages

### CI — `.github/workflows/ci.yml`

Executa em todo `push` e `pull_request`, na seguinte ordem: checkout, Node.js 24, Yarn 1.22.22 via Corepack, `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`, `yarn test`, `yarn build`, instalação do Chromium (`playwright install --with-deps chromium`) e `yarn test:e2e`. Qualquer falha reprova o pipeline. Em caso de falha, o relatório do Playwright é anexado como artefato.

### CD — `.github/workflows/deploy.yml`

- **Quando roda:** disparado pela conclusão do workflow **CI** (`workflow_run`), e só publica se a CI terminou com **sucesso**, num `push` à `main` deste repositório.
- **O que publica:** faz checkout **exatamente do commit validado** (`head_sha`), gera o build e publica com as actions oficiais (`configure-pages`, `upload-pages-artifact`, `deploy-pages`).
- **Proteção contra versão antiga:** se a `main` já tiver avançado, o deploy do commit anterior é ignorado (o commit mais novo é publicado pela sua própria CI).

**Configuração necessária no GitHub** (uma vez): *Settings → Pages → Build and deployment → Source: **GitHub Actions***.

### Evidências da publicação

Primeira publicação, a partir do commit `a0812fd` na `main`:

- **CI** ([execução 38169726823](https://github.com/Avelar19/smartstore-react-typescript/actions/runs/38169726823)): ✅ sucesso em 2 min 48 s. No runner, **246 testes Vitest** e **23 testes Playwright** passaram, com Yarn 1.22.22.
- **Deploy** ([execução 38169920493](https://github.com/Avelar19/smartstore-react-typescript/actions/runs/38169920493)): ✅ sucesso, publicando **o mesmo commit** validado pela CI no ambiente `github-pages`.
- **Verificação da aplicação publicada**, com a DummyJSON real e sem mocks:
  - abertura direta de `/products/8`: o GitHub Pages devolve o `404.html`, a URL é restaurada e o produto é exibido com a imagem carregada;
  - recarregar `/products/8` mantém o produto;
  - `/products?q=phone` mantém a query e mostra 23 resultados;
  - `/admin` sem sessão leva ao login; após o login real, volta ao painel; **recarregar `/admin`** restaura a sessão via `GET /auth/me` (200);
  - logout remove o token;
  - no celular (390 px), não há rolagem horizontal;
  - nenhum erro inesperado no console.

### Links diretos no GitHub Pages (`404.html`)

O GitHub Pages não tem fallback de SPA: um acesso direto a `/smartstore-react-typescript/products/8` receberia um erro 404. A solução segue a técnica do [spa-github-pages](https://github.com/rafgraph/spa-github-pages):

1. O build gera `dist/404.html` (plugin em `build/githubPagesSpaFallback.ts`, que usa o mesmo `base` do Vite).
2. Esse arquivo redireciona para `/smartstore-react-typescript/?/products/8` (rota e query codificadas).
3. Um script no `<head>` do `index.html` restaura a URL original com `history.replaceState`, antes de o React iniciar e sem criar entrada extra no histórico.
4. O React Router, com `basename` derivado de `import.meta.env.BASE_URL`, renderiza a rota.

Esse comportamento é verificado nos testes E2E com um servidor que emula o GitHub Pages (`scripts/serve-github-pages.ts`). As rotas testadas são `/products`, `/products/8`, `/products?q=phone`, `/products?category=laptops&page=1`, `/admin` e `/admin/products/new`, além do recarregamento e do botão "Voltar".

## Proteção da branch `main`

A `main` está **protegida** pelo ruleset **"Proteção da main"** (ativo, sem *bypass*, nem para administradores):

1. **Pull request obrigatório.** Nenhuma alteração entra diretamente na `main`. São exigidas zero aprovações, porque o projeto tem um único autor e o GitHub não permite aprovar o próprio PR.
2. **Check obrigatório `Validação`** (job do workflow CI, vinculado ao app GitHub Actions), com a branch **atualizada** em relação à `main` antes do merge.
3. **Conversas resolvidas** antes do merge.
4. **Bloqueio de force push e de exclusão** da `main`.

Para reproduzir em outro repositório: *Settings → Rules → Rulesets → New branch ruleset*, com alvo na branch padrão e as regras acima.

Com isso, todo código da `main` passa pela CI no PR, e o deploy publica apenas commits aprovados novamente pela CI após o merge.

## Checklist dos 10 requisitos

| # | Requisito | Como foi atendido | Situação |
|---|---|---|---|
| 1 | Componentes e TypeScript | Vite + React + TS `strict` (com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`); props tipadas; sem `any` (proibido pelo ESLint); composição com `children` (`AppProviders`, `PageSection`, `EmptyState`); Mantine + CSS Modules | ✅ Validado |
| 2 | Estado e ciclo de vida | `useState` (filtros, formulários, galeria); atualizações imutáveis (reducer do CRUD, com teste de imutabilidade); `useEffect` com dependências corretas e *cleanup* (`AbortController` em `useApiQuery`, título da página, timer de expiração) | ✅ Validado |
| 3 | Context API | `AuthContext`, `AuthProvider` e `useAuth`, que lança erro descritivo fora do Provider (testado); valor do contexto memorizado | ✅ Validado |
| 4 | React Router | Rotas declarativas (`routes.tsx`), layout persistente com `Outlet`, `NavLink` com rota ativa, `useNavigate`, `useParams` (`/products/:id`), página 404, rotas protegidas por `ProtectedRoute`, *lazy loading* | ✅ Validado |
| 5 | Mantine | `MantineProvider`, `AppShell` responsivo, `@mantine/form`, `Pagination`, `Loader`/`Skeleton`, notificações | ✅ Validado |
| 6 | JWT | `POST /auth/login`, token no `sessionStorage`, sincronização com o contexto, logout, redirecionamento de não autenticados, expiração (`exp`, 401, `/auth/me`) | ✅ Validado (testes e API real) |
| 7 | Axios e Zod | `src/services/api.ts` com `baseURL` `https://dummyjson.com`, interceptors de requisição (Bearer) e resposta (erros normalizados, 401); schemas `z.object`, tipos com `z.infer`, `safeParse` em todas as respostas; `zod4Resolver`; notificações de erro sem duplicação | ✅ Validado |
| 8 | Vitest e RTL | 252 testes: renderização, busca, formulários, contexto de autenticação, rotas protegidas, carregamento e erro, interações; consultas semânticas e mocks determinísticos | ✅ Validado |
| 9 | Playwright | 23 testes E2E, incluindo os fluxos obrigatórios (rota protegida → login; busca → detalhes), em modo headless, com respostas da API controladas | ✅ Validado (local e `CI=true`) |
| 10 | CI/CD e GitHub Pages | CI em `push`/`pull_request` (typecheck, lint, Vitest, build, Playwright) e deploy que publica só o commit da `main` aprovado na CI; `base` do Vite pelo nome do repositório; `404.html` para links diretos e recarregamento; `main` protegida com PR e CI obrigatórios | ✅ Validado no GitHub (CI e deploy com sucesso; aplicação publicada verificada; ver *Evidências da publicação*) |

## Uso de inteligência artificial

Este projeto foi desenvolvido com o apoio do **Claude (Anthropic)**, por meio do Claude Code, como assistente de programação. O trabalho seguiu etapas definidas pelo autor (inicialização, páginas públicas, integração com a API, autenticação, painel administrativo, testes, E2E, CI/CD). Ao fim de cada etapa, o autor revisou o código e os relatórios e autorizou explicitamente a seguinte; nenhuma operação de commit, push ou deploy foi feita sem autorização.

A IA gerou a maior parte do código, dos testes e desta documentação. Também executou as validações (typecheck, lint, testes, build) e verificações manuais com a API real, e apontou bugs que foram corrigidos durante o desenvolvimento. As decisões e o conteúdo entregue são de responsabilidade do autor.

## Links

- Repositório: <https://github.com/Avelar19/smartstore-react-typescript>
- Aplicação (GitHub Pages): <https://avelar19.github.io/smartstore-react-typescript/>
- API: <https://dummyjson.com> · documentação: <https://dummyjson.com/docs>
