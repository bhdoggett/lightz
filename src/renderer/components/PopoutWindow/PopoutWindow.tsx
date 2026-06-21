import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const OwnerWindowContext = createContext<Window>(window)

export function useOwnerWindow(): Window {
  return useContext(OwnerWindowContext)
}

interface Props {
  title: string
  width?: number
  height?: number
  onClose: () => void
  children: React.ReactNode
}

export function PopoutWindow({ title, width = 900, height = 500, onClose, children }: Props) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const windowRef = useRef<Window | null>(null)

  useEffect(() => {
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    const popup = window.open(
      '',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top}`
    )
    if (!popup) {
      onClose()
      return
    }

    windowRef.current = popup
    popup.document.title = title

    const parentStyles = document.querySelectorAll('style, link[rel="stylesheet"]')
    parentStyles.forEach((node) => {
      popup.document.head.appendChild(node.cloneNode(true))
    })

    const fontLink = document.querySelector('link[href*="fonts.googleapis"]')
    if (fontLink) popup.document.head.appendChild(fontLink.cloneNode(true))
    const preconnects = document.querySelectorAll('link[rel="preconnect"]')
    preconnects.forEach((node) => popup.document.head.appendChild(node.cloneNode(true)))

    popup.document.body.style.margin = '0'
    popup.document.body.style.background = 'var(--bg-base)'
    popup.document.body.style.color = 'var(--text-primary)'
    popup.document.body.style.fontFamily = 'var(--font-sans)'
    popup.document.body.style.overflow = 'hidden'

    const div = popup.document.createElement('div')
    div.id = 'popout-root'
    div.style.width = '100vw'
    div.style.height = '100vh'
    popup.document.body.appendChild(div)

    setContainer(div)

    popup.addEventListener('beforeunload', onClose)
    return () => {
      popup.removeEventListener('beforeunload', onClose)
      popup.close()
    }
  }, [])

  if (!container || !windowRef.current) return null
  return createPortal(
    <OwnerWindowContext.Provider value={windowRef.current}>
      {children}
    </OwnerWindowContext.Provider>,
    container
  )
}
