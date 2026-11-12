import { useContext } from 'react'
import { AppContext } from './app-context'

export function useAppData() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppData must be used inside AppProvider')
  return context
}