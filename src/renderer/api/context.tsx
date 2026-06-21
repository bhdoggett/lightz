import { createContext, useContext } from 'react'
import type { LightzApi } from './types'

const ApiContext = createContext<LightzApi | null>(null)

export function useApi(): LightzApi {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi must be used within an ApiProvider')
  return api
}

export function ApiProvider({ api, children }: { api: LightzApi; children: React.ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}
