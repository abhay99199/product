import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Category, Product } from '../lib/types'

export type AppContextValue = {
  session: Session | null
  isAdmin: boolean
  adminCheckReady: boolean
  products: Product[]
  categories: Category[]
  loading: boolean
  error: string | null
  configured: boolean
  refresh: () => Promise<void>
}

export const AppContext = createContext<AppContextValue | null>(null)