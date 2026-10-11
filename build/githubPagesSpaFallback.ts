import type { Plugin } from 'vite'

/**
 * GitHub Pages não tem fallback de SPA: um link direto como /<repo>/products/8 recebe o
 * 404.html do site. Este plugin gera esse 404.html, que redireciona para /<repo>/?/products/8
 * (rota codificada na query). O script no index.html restaura a URL original antes do React
 * iniciar. Técnica baseada em https://github.com/rafgraph/spa-github-pages.
 *
 * O prefixo vem do `base` do Vite, fonte única do nome do repositório.
 */
export function githubPagesSpaFallback(): Plugin {
  let base = '/'

  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '404.html', source: renderFallbackPage(base) })
    },
  }
}

function renderFallbackPage(base: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartStore</title>
    <script>
      // Redireciona /base/rota?a=1&b=2 para /base/?/rota&a=1~and~b=2 (restaurado pelo index.html).
      (function (location) {
        var base = ${JSON.stringify(base)};
        if (location.pathname.indexOf(base) !== 0) return;
        var route = location.pathname.slice(base.length).replace(/&/g, '~and~');
        var query = location.search ? '&' + location.search.slice(1).replace(/&/g, '~and~') : '';
        location.replace(location.origin + base + '?/' + route + query + location.hash);
      })(window.location);
    </script>
  </head>
  <body>
    <noscript>
      Página não encontrada. <a href="${base}">Voltar para a SmartStore</a>.
    </noscript>
  </body>
</html>
`
}
