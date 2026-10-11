/**
 * Servidor estático que reproduz o comportamento do GitHub Pages para um site de projeto:
 * - arquivos existentes em dist/ são servidos sob /smartstore-react-typescript/;
 * - caminhos inexistentes recebem dist/404.html com status 404 (SEM fallback de SPA);
 * - /smartstore-react-typescript (sem barra) é redirecionado com 301.
 *
 * Usado pelos testes E2E para validar links diretos e recarregamentos como no site publicado.
 * Uso: node scripts/serve-github-pages.ts [porta]
 */
import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const ROOT = resolve('dist')
const BASE_PATH = '/smartstore-react-typescript/'
const PORT = Number(process.argv[2] ?? process.env['PORT'] ?? 4173)

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
}

async function sendFile(response: ServerResponse, filePath: string, status = 200): Promise<void> {
  const body = await readFile(filePath)
  response.writeHead(status, { 'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' })
  response.end(body)
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

const server = createServer((request, response) => {
  void (async () => {
    const url = new URL(request.url ?? '/', 'http://localhost')

    if (url.pathname === BASE_PATH.slice(0, -1)) {
      response.writeHead(301, { location: `${BASE_PATH}${url.search}` })
      response.end()
      return
    }

    if (!url.pathname.startsWith(BASE_PATH)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('404 - File not found')
      return
    }

    const relativePath = decodeURIComponent(url.pathname.slice(BASE_PATH.length))
    const requested = resolve(ROOT, relativePath === '' || relativePath.endsWith('/') ? join(relativePath, 'index.html') : relativePath)

    // Impede acesso fora de dist/ (path traversal).
    if (requested !== ROOT && !requested.startsWith(ROOT + sep)) {
      response.writeHead(403)
      response.end()
      return
    }

    if (await isFile(requested)) {
      await sendFile(response, requested)
      return
    }

    // Como no GitHub Pages: rota desconhecida recebe o 404.html personalizado, com status 404.
    await sendFile(response, join(ROOT, '404.html'), 404)
  })().catch((error: unknown) => {
    response.writeHead(500)
    response.end(String(error))
  })
})

server.listen(PORT, () => {
  console.log(`GitHub Pages (emulado): http://localhost:${PORT}${BASE_PATH}`)
})
