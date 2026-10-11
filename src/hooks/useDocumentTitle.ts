import { useEffect } from 'react'

const APP_NAME = 'SmartStore'

/** Atualiza o título da aba e restaura o anterior quando o componente é desmontado. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME

    return () => {
      document.title = previousTitle
    }
  }, [title])
}
