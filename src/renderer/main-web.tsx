import React, { useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ApiProvider } from './api/context'
import { createWebApi } from './api/web-provider'
import { useDmxState } from './hooks/useDmxState'
import './globals.css'

function WebApp() {
  const dmxState = useDmxState()
  const getChannelRef = useRef(dmxState.getChannel)
  getChannelRef.current = dmxState.getChannel

  const apiRef = useRef<ReturnType<typeof createWebApi> | null>(null)
  if (!apiRef.current) {
    apiRef.current = createWebApi({
      setChannel: dmxState.setChannel,
      getChannelValue: (u, ch) => getChannelRef.current(u, ch),
    })
  }

  return (
    <ApiProvider api={apiRef.current}>
      <App />
    </ApiProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WebApp />
  </React.StrictMode>
)
