import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { ApiProvider } from './api/context'
import { electronApi } from './api/electron-provider'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApiProvider api={electronApi}>
      <App />
    </ApiProvider>
  </React.StrictMode>
)
