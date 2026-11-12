import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Category, Product } from '../lib/types'
import { AppContext } from './app-context'

export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckReady, setAdminCheckReady] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (!data.session) {
        setIsAdmin(false)
        setAdminCheckReady(true)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession) {
        setIsAdmin(false)
        setAdminCheckReady(true)
      } else {
        setAdminCheckReady(false)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function checkAdmin() {
      if (!supabase || !session) return
      const { data, error: roleError } = await supabase.rpc('is_admin')
      if (active) {
        setIsAdmin(!roleError && data === true)
        setAdminCheckReady(true)
      }
    }

    void checkAdmin()
    return () => {
      active = false
    }
  }, [session])

  const refresh = useCallback(async (showLoading = true) => {
    if (!supabase) return
    if (showLoading) setLoading(true)
    const productQuery = supabase
      .from('products')
      .select('*, category:categories(id, name, slug)')
      .order('created_at', { ascending: false })
    const visibleProducts = isAdmin ? productQuery : productQuery.eq('status', 'published')
    try {
      const [productResult, categoryResult] = await Promise.all([
        visibleProducts,
        supabase.from('categories').select('*').order('name'),
      ])
      if (productResult.error || categoryResult.error) {
        setError(productResult.error?.message ?? categoryResult.error?.message ?? 'Could not load the catalog.')
      } else {
        setError(null)
        setProducts((productResult.data ?? []) as Product[])
        setCategories((categoryResult.data ?? []) as Category[])
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the catalog.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true
    async function loadCatalog(client: NonNullable<typeof supabase>) {
      const productQuery = client
        .from('products')
        .select('*, category:categories(id, name, slug)')
        .order('created_at', { ascending: false })
      const visibleProducts = isAdmin ? productQuery : productQuery.eq('status', 'published')
      try {
        const [productResult, categoryResult] = await Promise.all([
          visibleProducts,
          client.from('categories').select('*').order('name'),
        ])
        if (!active) return
        if (productResult.error || categoryResult.error) {
          setError(productResult.error?.message ?? categoryResult.error?.message ?? 'Could not load the catalog.')
        } else {
          setError(null)
          setProducts((productResult.data ?? []) as Product[])
          setCategories((categoryResult.data ?? []) as Category[])
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load the catalog.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadCatalog(client)
    return () => { active = false }
  }, [isAdmin])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel = client
      .channel('catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { void refresh(false) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => { void refresh(false) })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [refresh])

  const value = useMemo(
    () => ({ session, isAdmin, adminCheckReady, products, categories, loading, error, configured: isSupabaseConfigured, refresh }),
    [session, isAdmin, adminCheckReady, products, categories, loading, error, refresh],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}