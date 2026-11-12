import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ExternalLink, Eye, Filter,
  LayoutDashboard, Link as LinkIcon, LoaderCircle, LockKeyhole, LogOut, Menu, Plus,
  Search, Sparkles, Tags, Trash2, TrendingUp, Upload, X,
} from 'lucide-react'
import { AppProvider } from './context/AppContext'
import { useAppData } from './context/useAppData'
import type { Category, ClickCount, Product } from './lib/types'
import { supabase } from './lib/supabase'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const currentYear = new Date().getFullYear()
const todayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

function safeProductUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatPrice(price: number | null) {
  return price === null ? null : money.format(price)
}

function recordClick(productId: string) {
  if (supabase) void supabase.from('click_analytics').insert({ product_id: productId })
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/about" element={<InfoPage page="about" />} />
          <Route path="/contact" element={<InfoPage page="contact" />} />
          <Route path="/privacy" element={<InfoPage page="privacy" />} />
          <Route path="/disclaimer" element={<InfoPage page="disclaimer" />} />
          <Route path="/admin/reset-password" element={<PasswordResetPage />} />
          <Route path="/admin/*" element={<AdminArea />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

function SiteHeader() {
  const { categories } = useAppData()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Findwell home"><span className="brand-mark"><Sparkles size={18} strokeWidth={2.2} /></span><span>findwell<span className="brand-period">.</span></span></Link>
        <button className="icon-button mobile-menu-button" type="button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <Link to="/#discover" onClick={() => setMenuOpen(false)}>Discover</Link><a href="/#featured" onClick={() => setMenuOpen(false)}>Featured</a><a href="/#categories" onClick={() => setMenuOpen(false)}>Categories</a><Link className="nav-admin" to="/admin" onClick={() => setMenuOpen(false)}>Admin <ArrowUpRight size={14} /></Link>
        </nav>
      </div>
      <div className="category-strip" id="categories"><div className="category-strip-inner"><Link to="/#discover" className="category-chip">All finds</Link>{categories.map((category) => <Link key={category.id} to={`/?category=${encodeURIComponent(category.slug)}#discover`} className="category-chip">{category.name}</Link>)}</div></div>
    </header>
  )
}

function SetupNotice() {
  const { configured, error } = useAppData()
  if (configured && !error) return null
  return <div className={`setup-notice ${error ? 'has-error' : ''}`} role="status"><span className="setup-dot" /><span>{error ? `Catalog connection issue: ${error}` : 'Connect your Supabase project to publish the live catalog.'}</span>{!configured && <Link to="/admin">Setup details <ArrowUpRight size={14} /></Link>}</div>
}

function HomePage() {
  const { products, loading, categories } = useAppData()
  const [clickCounts, setClickCounts] = useState<ClickCount[]>([])
  const [searchText, setSearchText] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) return
    void supabase.rpc('get_product_click_counts').then(({ data }) => setClickCounts((data ?? []) as ClickCount[]))
  }, [products.length])

  const featured = products.filter((product) => product.is_featured).slice(0, 4)
  const latest = products.slice(0, 8)
  const clickMap = new Map(clickCounts.map((entry) => [entry.product_id, entry.click_count]))
  const trending = [...products].sort((a, b) => (clickMap.get(b.id) ?? 0) - (clickMap.get(a.id) ?? 0)).slice(0, 4)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchText.trim()
    navigate(query ? `/?q=${encodeURIComponent(query)}#discover` : '/#discover')
  }

  return (
    <div className="site-shell"><SiteHeader /><main><SetupNotice />
      <section className="hero-section"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> THE GOOD-FIND EDITION</p><h1>Discover Products<br /><em>Worth Buying</em></h1><p className="hero-subtitle">Handpicked products, amazing finds, and smart choices.</p>
        <form className="hero-search" onSubmit={submitSearch} role="search"><Search size={19} aria-hidden="true" /><input aria-label="Search products" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search the collection" /><button type="submit" aria-label="Submit product search"><ArrowRight size={18} /></button></form>
        <div className="hero-note"><span className="note-star">✳</span> A little less scrolling. A lot more finding.</div></div>
        <div className="hero-art" aria-label="A considered collection of everyday objects" role="img"><div className="hero-art-photo" /><div className="hero-art-tag"><span>GOOD THINGS,</span><strong>found here.</strong><Sparkles size={17} /></div><div className="hero-art-index">FW / 001<br />CURATED DAILY</div></div>
        <div className="hero-bottomline"><span>USEFUL THINGS, BEAUTIFULLY FOUND</span><span>{String(products.length).padStart(2, '0')} THINGS TO DISCOVER</span></div>
      </section>
      <section className="discovery-intro section-wrap" id="discover"><div><p className="eyebrow">A CURATED COLLECTION</p><h2>Find your next<br /><em>favourite thing.</em></h2></div><p>Good design, clever details, and small upgrades that make a difference. All in one thoughtful place.</p></section>
      {loading ? <LoadingState label="Gathering the good finds" /> : <>
        <ProductSection id="featured" eyebrow="THE SHORTLIST" title="Featured finds" products={featured} action={<Link className="text-link" to="/?sort=featured#discover">See the edit <ArrowRight size={15} /></Link>} />
        <ProductSection id="trending" eyebrow="GETTING NOTICED" title="Trending now" products={trending} action={<span className="section-side-note"><TrendingUp size={15} /> Most explored</span>} emptyText="The first discoveries are just around the corner." />
        <ProductSection id="latest" eyebrow="FRESHLY FOUND" title="Latest arrivals" products={latest} action={<a className="text-link" href="#all-finds">Browse all <ArrowRight size={15} /></a>} />
      </>}
      <CatalogSection products={products} categories={categories} loading={loading} />
      <section className="closing-band"><span className="closing-stamp"><Sparkles size={19} /></span><p>Better finds. <em>Less fuss.</em></p><a href="#discover" className="round-link" aria-label="Back to discovery"><ArrowUpRight size={20} /></a></section>
    </main><SiteFooter /></div>
  )
}

function ProductSection({ id, eyebrow, title, products, action, emptyText }: { id: string; eyebrow: string; title: string; products: Product[]; action: ReactNode; emptyText?: string }) {
  return <section className="product-section section-wrap" id={id}><div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><div className="section-action">{action}</div></div>{products.length ? <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="section-empty"><span className="empty-star">✳</span><p>{emptyText ?? 'The next great find is on its way.'}</p></div>}</section>
}

function CatalogSection({ products, categories, loading }: { products: Product[]; categories: Category[]; loading: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const categorySlug = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesQuery = !query || `${product.name} ${product.description} ${product.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = !categorySlug || product.category?.slug === categorySlug
      const matchesMin = !minPrice || product.price !== null && product.price >= Number(minPrice)
      const matchesMax = !maxPrice || product.price !== null && product.price <= Number(maxPrice)
      return matchesQuery && matchesCategory && matchesMin && matchesMax
    })
    if (sort === 'featured') filtered.sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
    if (sort === 'price-low') filtered.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY))
    if (sort === 'price-high') filtered.sort((a, b) => (b.price ?? -1) - (a.price ?? -1))
    return filtered
  }, [products, query, categorySlug, minPrice, maxPrice, sort])

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateParam('q', query.trim())
  }

  return <section className="catalog-section section-wrap" id="all-finds"><div className="catalog-header"><div><p className="eyebrow">THE WHOLE COLLECTION</p><h2>Browse everything<span className="brand-period">.</span></h2></div><span className="catalog-count">{visibleProducts.length.toString().padStart(2, '0')} FINDS</span></div>
    <div className="filter-bar"><form className="filter-search" onSubmit={submitSearch} role="search"><Search size={16} /><input value={query} onChange={(event) => updateParam('q', event.target.value.trim())} placeholder="Search products" aria-label="Search all products" /></form>
      <label className="select-control"><Tags size={15} /><select aria-label="Filter by category" value={categorySlug} onChange={(event) => updateParam('category', event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select><ChevronDown size={14} /></label>
      <label className="select-control"><Filter size={15} /><select aria-label="Sort products" value={sort} onChange={(event) => updateParam('sort', event.target.value)}><option value="newest">Newest first</option><option value="featured">Featured first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ChevronDown size={14} /></label>
      <div className="price-filter"><span>PRICE</span><input aria-label="Minimum price" inputMode="decimal" type="number" min="0" placeholder="Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /><span className="price-dash">–</span><input aria-label="Maximum price" inputMode="decimal" type="number" min="0" placeholder="Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></div></div>
    {loading ? <LoadingState label="Loading products" /> : visibleProducts.length ? <div className="product-grid catalog-grid">{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="catalog-empty"><Search size={22} /><h3>{products.length ? 'No finds match those filters.' : 'The shelves are clear for now.'}</h3><p>{products.length ? 'Try another search or clear a filter.' : 'New discoveries will appear here as soon as they are published.'}</p>{(query || categorySlug || minPrice || maxPrice) && <button className="quiet-button" type="button" onClick={() => { setMinPrice(''); setMaxPrice(''); setSearchParams({}, { replace: true }) }}>Clear filters <X size={14} /></button>}</div>}
  </section>
}

function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  return <article className="product-card" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}><Link to={`/product/${product.id}`} className="product-image-link" aria-label={`View ${product.name}`}><div className="product-image-wrap">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="image-placeholder"><Sparkles size={23} /><span>IMAGE COMING SOON</span></div>}{product.is_featured && <span className="featured-label"><Sparkles size={12} /> SELECTED</span>}<span className="card-arrow"><ArrowUpRight size={16} /></span></div></Link>
    <div className="product-card-copy"><div className="product-card-meta"><span>{product.category?.name ?? 'THE FIND'}</span>{formatPrice(product.price) && <strong>{formatPrice(product.price)}</strong>}</div><Link to={`/product/${product.id}`} className="product-card-title">{product.name}</Link><p>{product.description}</p><a className="card-cta" href={product.product_url} target="_blank" rel="noopener noreferrer" onClick={() => recordClick(product.id)}>View product <ArrowUpRight size={15} /></a></div></article>
}

function ProductPage() {
  const { id } = useParams()
  const { products, loading } = useAppData()
  const product = products.find((entry) => entry.id === id)
  const related = products.filter((entry) => entry.id !== id && (!product?.category_id || entry.category_id === product.category_id)).slice(0, 4)

  useEffect(() => {
    if (product) document.title = `${product.name} | Findwell`
    return () => { document.title = 'Findwell | Products worth discovering' }
  }, [product])

  if (loading) return <div className="site-shell"><SiteHeader /><LoadingState label="Opening this find" /></div>
  if (!product) return <div className="site-shell"><SiteHeader /><section className="not-found section-wrap"><span className="eyebrow">NOT FOUND</span><h1>This find has moved on.</h1><Link className="dark-button" to="/">Back to discovery <ArrowRight size={16} /></Link></section><SiteFooter /></div>

  return <div className="site-shell"><SiteHeader /><main><div className="detail-breadcrumb section-wrap"><Link to="/"><ArrowLeft size={15} /> All finds</Link><span>/</span><span>{product.category?.name ?? 'Product'}</span></div>
    <section className="product-detail section-wrap"><div className="detail-image">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="image-placeholder"><Sparkles size={28} /><span>IMAGE COMING SOON</span></div>}<span className="image-index">F / {product.id.slice(0, 4).toUpperCase()}</span></div>
      <div className="detail-copy"><p className="eyebrow"><span className="eyebrow-line" /> {product.category?.name ?? 'A GOOD FIND'}</p><h1>{product.name}</h1>{formatPrice(product.price) && <p className="detail-price">{formatPrice(product.price)}</p>}<div className="detail-rule" /><p className="detail-description">{product.description}</p>{product.tags.length > 0 && <div className="detail-tags">{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <a className="buy-button" href={product.product_url} target="_blank" rel="noopener noreferrer" onClick={() => recordClick(product.id)}>Buy now <ExternalLink size={17} /></a><p className="outbound-note">You’ll continue to an external product page.</p><div className="detail-footnote"><span>FINDWELL PICK</span><span>NO. {product.id.slice(-5).toUpperCase()}</span></div></div></section>
    {related.length > 0 && <ProductSection id="related" eyebrow="IN THE SAME ORBIT" title="Related finds" products={related} action={<Link className="text-link" to="/#discover">Explore all <ArrowRight size={15} /></Link>} />}</main><SiteFooter /></div>
}

function SiteFooter() {
  return <footer className="site-footer"><div className="footer-main section-wrap"><div className="footer-brand"><Link className="brand" to="/"><span className="brand-mark"><Sparkles size={17} /></span><span>findwell<span className="brand-period">.</span></span></Link><p>Thoughtful finds for everyday life.</p></div><div className="footer-links"><span className="footer-label">FINDWELL</span><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy policy</Link><Link to="/disclaimer">Disclaimer</Link></div><div className="footer-signoff"><span>MADE FOR THE CURIOUS</span><span>© {currentYear} FINDWELL</span></div></div><div className="footer-bottom"><span>GOOD THINGS ARE OUT THERE.</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>BACK TO TOP ↑</a></div></footer>
}

function InfoPage({ page }: { page: 'about' | 'contact' | 'privacy' | 'disclaimer' }) {
  const copy = {
    about: ['A considered collection.', 'Findwell gathers useful, well-designed, and delightfully unexpected products in one easy-to-explore place. Every item is selected for its potential to make everyday life a little better.'],
    contact: ['Let’s talk.', 'Add your preferred support email before launch so visitors know where to reach you.'],
    privacy: ['Your privacy matters.', 'Findwell does not sell personal information. Product browsing does not require an account. When you follow an external product link, the destination site’s privacy practices apply.'],
    disclaimer: ['A note on recommendations.', 'Some product links may be affiliate links. If you purchase through one, Findwell may earn a small commission at no additional cost to you. Product availability and prices can change; please confirm details on the destination page.'],
  }[page]
  return <div className="site-shell"><SiteHeader /><main className="info-page section-wrap"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to finds</Link><p className="eyebrow">FINDWELL / {page.toUpperCase()}</p><h1>{copy[0]}</h1><p>{copy[1]}</p></main><SiteFooter /></div>
}

function LoadingState({ label }: { label: string }) {
  return <div className="loading-state" role="status"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>
}

function AdminArea() {
  const { session, isAdmin, adminCheckReady, configured } = useAppData()
  const navigate = useNavigate()
  const location = window.location.pathname
  if (!configured) return <AdminSetup />
  if (!session) return <AdminLogin />
  if (!adminCheckReady) return <div className="admin-wait"><LoadingState label="Verifying administrator access" /></div>
  if (!isAdmin) return <AdminDenied onLogout={() => { void supabase?.auth.signOut(); navigate('/') }} />
  return <AdminDashboard location={location} />
}

function AdminSetup() {
  return <main className="admin-login-shell"><Link className="brand" to="/"><span className="brand-mark"><Sparkles size={18} /></span><span>findwell<span className="brand-period">.</span></span></Link><section className="login-panel setup-panel"><span className="login-icon"><LockKeyhole size={21} /></span><p className="eyebrow">ONE-TIME SETUP</p><h1>Connect your catalog.</h1><p className="login-description">Add your Supabase project URL and publishable key to a local <code>.env</code> file, then apply the included database migration. The setup guide walks through each step.</p><Link className="dark-button" to="/">Back to the site <ArrowRight size={16} /></Link><a className="setup-doc-link" href="/README.md" target="_blank" rel="noreferrer">Open setup guide <ArrowUpRight size={15} /></a></section></main>
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (loginError) setError('Those sign-in details could not be verified. Check them and try again.')
    setBusy(false)
  }

  async function sendPasswordRecovery() {
    if (!supabase) return
    if (!email.trim()) {
      setError('Enter your account email first, then request a reset link.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })
    if (recoveryError) setError('Could not send the recovery email. Check the Supabase redirect URL settings and try again.')
    else setNotice('If that email belongs to an account, a password reset link is on its way.')
    setBusy(false)
  }

  return <main className="admin-login-shell"><Link className="brand" to="/"><span className="brand-mark"><Sparkles size={18} /></span><span>findwell<span className="brand-period">.</span></span></Link><section className="login-panel"><span className="login-icon"><LockKeyhole size={21} /></span><p className="eyebrow">PRIVATE ACCESS</p><h1>Welcome back.</h1><p className="login-description">Sign in to manage your collection.</p>
    <form className="login-form" onSubmit={(event) => void submit(event)}><label>Email address<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}<button className="dark-button full-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : 'Sign in'} {!busy && <ArrowRight size={16} />}</button><button className="recovery-link" type="button" onClick={() => void sendPasswordRecovery()} disabled={busy}>Forgot password?</button></form><Link className="back-link login-back" to="/"><ArrowLeft size={14} /> Return to the website</Link></section><span className="admin-login-caption">FINDWELL / ADMINISTRATION</span></main>
}

function PasswordResetPage() {
  const [ready, setReady] = useState(!supabase)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasSession(Boolean(data.session))
        setReady(true)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setHasSession(Boolean(session))
        setReady(true)
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setError('')
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else setUpdated(true)
    setBusy(false)
  }

  return <main className="admin-login-shell"><Link className="brand" to="/"><span className="brand-mark"><Sparkles size={18} /></span><span>findwell<span className="brand-period">.</span></span></Link><section className="login-panel"><span className="login-icon"><LockKeyhole size={21} /></span><p className="eyebrow">ACCOUNT SECURITY</p><h1>{updated ? 'Password updated.' : 'Choose a new password.'}</h1>{!ready ? <p className="login-description">Checking your recovery link…</p> : updated ? <><p className="login-description">Your admin password has been changed.</p><Link className="dark-button full-button" to="/admin">Continue to admin <ArrowRight size={16} /></Link></> : !hasSession ? <><p className="login-description">This recovery link is invalid or expired. Request a fresh link from the admin sign-in screen.</p><Link className="dark-button full-button" to="/admin">Back to sign in <ArrowRight size={16} /></Link></> : <><p className="login-description">Choose a new password for your administrator account.</p><form className="login-form" onSubmit={(event) => void submit(event)}><label>New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><label>Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="dark-button full-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : 'Update password'} {!busy && <Check size={16} />}</button></form></>}</section></main>
}

function AdminDenied({ onLogout }: { onLogout: () => void }) {
  return <main className="admin-login-shell"><Link className="brand" to="/"><span className="brand-mark"><Sparkles size={18} /></span><span>findwell<span className="brand-period">.</span></span></Link><section className="login-panel"><span className="login-icon warning-icon"><LockKeyhole size={21} /></span><p className="eyebrow">RESTRICTED AREA</p><h1>Admin access only.</h1><p className="login-description">This account is signed in but is not on the administrator list.</p><button className="dark-button full-button" type="button" onClick={onLogout}>Sign out <LogOut size={16} /></button><Link className="back-link login-back" to="/">Return to the website <ArrowRight size={14} /></Link></section></main>
}

function AdminDashboard({ location }: { location: string }) {
  const { products, categories, refresh } = useAppData()
  const navigate = useNavigate()
  const [clickTotal, setClickTotal] = useState(0)
  const [productQuery, setProductQuery] = useState('')
  const [productStatus, setProductStatus] = useState('all')
  const [productCategory, setProductCategory] = useState('all')
  const isEditor = location.endsWith('/new') || /\/products\/[^/]+$/.test(location) && !location.endsWith('/products')

  useEffect(() => {
    if (!supabase) return
    void supabase.from('click_analytics').select('id', { count: 'exact', head: true }).then(({ count }) => setClickTotal(count ?? 0))
  }, [products.length])

  const editId = location.endsWith('/new') ? null : isEditor ? location.split('/').pop() ?? null : null
  async function logout() { await supabase?.auth.signOut(); navigate('/') }
  const filteredProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category?.name ?? ''}`.toLowerCase().includes(productQuery.toLowerCase())
    const matchesStatus = productStatus === 'all' || product.status === productStatus
    const matchesCategory = productCategory === 'all' || product.category_id === productCategory
    return matchesQuery && matchesStatus && matchesCategory
  })

  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="brand admin-brand" to="/"><span className="brand-mark"><Sparkles size={17} /></span><span>findwell<span className="brand-period">.</span></span></Link><span className="sidebar-label">WORKSPACE</span>
    <Link to="/admin" className={`sidebar-link ${!isEditor && !location.includes('products') ? 'active' : ''}`}><LayoutDashboard size={17} /> Overview</Link><Link to="/admin/products" className={`sidebar-link ${location.includes('/products') ? 'active' : ''}`}><Tags size={17} /> Products <span className="sidebar-count">{products.length}</span></Link>
    <span className="sidebar-label sidebar-bottom-label">ACCOUNT</span><Link to="/" className="sidebar-link"><Eye size={17} /> View website <ArrowUpRight size={13} /></Link><button className="sidebar-link sidebar-logout" type="button" onClick={() => void logout()}><LogOut size={17} /> Sign out</button>
    <div className="sidebar-user"><span className="user-avatar">F</span><span><strong>Findwell admin</strong><small>Administrator</small></span><button className="icon-button" type="button" title="Sign out" aria-label="Sign out" onClick={() => void logout()}><LogOut size={15} /></button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><span className="admin-breadcrumb">Workspace <span>/</span> {isEditor ? editId ? 'Edit product' : 'New product' : location.includes('products') ? 'Products' : 'Overview'}</span><Link className="admin-add-button" to="/admin/products/new"><Plus size={16} /> Add product</Link></header><div className="admin-content">
      {isEditor ? <ProductEditor productId={editId} onSaved={async () => { await refresh(); navigate('/admin/products') }} /> : location.includes('/products') ? <section className="admin-products-view"><div className="admin-page-title"><div><p className="eyebrow">YOUR COLLECTION</p><h1>Products <span>{products.length}</span></h1><p>Keep every find tidy, current, and ready to discover.</p></div><Link className="dark-button" to="/admin/products/new"><Plus size={16} /> Add product</Link></div>
        <div className="admin-table-tools"><label className="admin-search"><Search size={17} /><input aria-label="Search products" placeholder="Search products or categories" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} /></label><div className="admin-filter-set"><label className="admin-select-label"><span className="sr-only">Filter by status</span><select aria-label="Filter by status" value={productStatus} onChange={(event) => setProductStatus(event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select><ChevronDown size={13} /></label><label className="admin-select-label"><span className="sr-only">Filter by category</span><select aria-label="Filter by category" value={productCategory} onChange={(event) => setProductCategory(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><ChevronDown size={13} /></label><span>{filteredProducts.length} RESULTS</span></div></div>
        {filteredProducts.length ? <div className="product-table-wrap"><table className="product-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>STATUS</th><th>FEATURED</th><th>UPDATED</th><th aria-label="Actions" /></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><div className="table-product"><div className="table-thumb">{product.image_url ? <img src={product.image_url} alt="" /> : <Sparkles size={15} />}</div><span><strong>{product.name}</strong><small>{formatPrice(product.price) ?? 'Price not set'}</small></span></div></td><td>{product.category?.name ?? <span className="muted">Uncategorized</span>}</td><td><span className={`status-pill ${product.status}`}>{product.status}</span></td><td>{product.is_featured ? <span className="featured-pill"><Sparkles size={12} /> Featured</span> : <span className="muted">—</span>}</td><td className="date-cell">{product.updated_at.slice(0, 10)}</td><td><Link className="table-edit" to={`/admin/products/${product.id}`} aria-label={`Edit ${product.name}`}>Edit <ArrowUpRight size={14} /></Link></td></tr>)}</tbody></table></div> : <div className="admin-empty"><Tags size={23} /><h2>{products.length ? 'No matches found.' : 'Your collection starts here.'}</h2><p>{products.length ? 'Try another product or category name.' : 'Add a product to publish your first find.'}</p>{!products.length && <Link className="dark-button" to="/admin/products/new"><Plus size={16} /> Add first product</Link>}</div>}</section> : <section className="admin-overview"><div className="admin-page-title"><div><p className="eyebrow">YOUR COLLECTION, AT A GLANCE</p><h1>Good morning<span className="brand-period">.</span></h1><p>Here’s what’s happening with your finds.</p></div><span className="today-date">{todayLabel}</span></div>
        <div className="stat-grid"><StatCard label="Total products" value={products.length} icon={<Tags size={18} />} foot="Across your whole collection" /><StatCard label="Categories" value={categories.length} icon={<LayoutDashboard size={18} />} foot="Ways to explore" /><StatCard label="Featured finds" value={products.filter((product) => product.is_featured).length} icon={<Sparkles size={18} />} foot="On the homepage edit" /><StatCard label="Product clicks" value={clickTotal} icon={<TrendingUp size={18} />} foot="Tracked outbound visits" /></div>
        <div className="overview-lower"><div className="overview-panel"><div className="panel-heading"><div><p className="eyebrow">RECENTLY ADDED</p><h2>Latest products</h2></div><Link className="text-link" to="/admin/products">View all <ArrowRight size={15} /></Link></div>{products.length ? <div className="recent-list">{products.slice(0, 5).map((product) => <div className="recent-row" key={product.id}><div className="table-thumb">{product.image_url ? <img src={product.image_url} alt="" /> : <Sparkles size={15} />}</div><div className="recent-name"><strong>{product.name}</strong><small>{product.category?.name ?? 'Uncategorized'}</small></div><span className={`status-pill ${product.status}`}>{product.status}</span><Link to={`/admin/products/${product.id}`} aria-label={`Edit ${product.name}`} className="recent-edit"><ArrowUpRight size={15} /></Link></div>)}</div> : <div className="recent-empty"><p>No products yet. Your first find is a few clicks away.</p><Link to="/admin/products/new" className="text-link">Add a product <ArrowRight size={15} /></Link></div>}</div>
          <div className="overview-note"><span className="overview-note-mark"><Sparkles size={19} /></span><p className="eyebrow">A SMALL REMINDER</p><h2>Good finds deserve to be found.</h2><p>Keep product details current and your featured edit fresh. Changes appear on the website as soon as they’re saved.</p><Link to="/admin/products/new" className="text-link">Add something new <ArrowRight size={15} /></Link></div></div></section>}
    </div></main></div>
}

function StatCard({ label, value, icon, foot }: { label: string; value: number; icon: ReactNode; foot: string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value.toLocaleString()}</strong><small>{foot}</small></article>
}

function ProductEditor({ productId, onSaved }: { productId: string | null; onSaved: () => Promise<void> }) {
  const { products, categories, loading, refresh } = useAppData()
  const product = productId ? products.find((entry) => entry.id === productId) : null
  if (productId && !product) {
    return loading ? <LoadingState label="Loading product details" /> : <div className="admin-empty"><h2>Product not found.</h2><Link to="/admin/products" className="text-link">Back to products <ArrowRight size={15} /></Link></div>
  }
  return <ProductEditorForm key={productId ?? 'new'} productId={productId} product={product ?? null} categories={categories} refresh={refresh} onSaved={onSaved} />
}

function ProductEditorForm({ productId, product, categories, refresh, onSaved }: { productId: string | null; product: Product | null; categories: Category[]; refresh: () => Promise<void>; onSaved: () => Promise<void> }) {
  const existing = product
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [productUrl, setProductUrl] = useState(existing?.product_url ?? '')
  const [price, setPrice] = useState(existing?.price?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? '')
  const [newCategory, setNewCategory] = useState('')
  const [createCategory, setCreateCategory] = useState(false)
  const [featured, setFeatured] = useState(existing?.is_featured ?? false)
  const [status, setStatus] = useState<Product['status']>(existing?.status ?? 'draft')
  const [tagsText, setTagsText] = useState(existing?.tags.join(', ') ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState(existing?.image_url ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const activePreview = previewUrl
    return () => { if (activePreview.startsWith('blob:')) URL.revokeObjectURL(activePreview) }
  }, [previewUrl])

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Choose an image file to continue.'); return }
    if (file.size > 15 * 1024 * 1024) { setError('Choose an image smaller than 15 MB. It will be optimized before upload.'); return }
    setError(''); setImageFile(file); setPreviewUrl(URL.createObjectURL(file))
  }

  async function optimizeImage(file: File) {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is unavailable in this browser.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not optimize this image.')), 'image/webp', 0.84))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setError(''); setNotice('')
    if (!safeProductUrl(productUrl.trim())) { setError('Enter a complete product link beginning with http:// or https://.'); return }
    if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) { setError('Price must be a positive number.'); return }
    setBusy(true)
    try {
      let selectedCategoryId = categoryId || null
      if (createCategory && newCategory.trim()) {
        const { data: category, error: categoryError } = await supabase.from('categories').insert({ name: newCategory.trim(), slug: slugify(newCategory) }).select('id').single()
        if (categoryError) throw categoryError
        selectedCategoryId = category.id
      }
      let imageUrl = existing?.image_url ?? null
      if (imageFile) {
        const imageBlob = await optimizeImage(imageFile)
        const filePath = `${crypto.randomUUID()}.webp`
        const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, imageBlob, { contentType: 'image/webp', cacheControl: '31536000' })
        if (uploadError) throw uploadError
        imageUrl = supabase.storage.from('product-images').getPublicUrl(filePath).data.publicUrl
      }
      const record = { name: name.trim(), description: description.trim(), product_url: productUrl.trim(), image_url: imageUrl, price: price ? Number(price) : null, category_id: selectedCategoryId, is_featured: featured, status, tags: tagsText.split(',').map((tag) => tag.trim()).filter(Boolean) }
      const result = productId ? await supabase.from('products').update(record).eq('id', productId) : await supabase.from('products').insert(record)
      if (result.error) throw result.error
      await refresh()
      setNotice(status === 'published' ? 'Product published and live on the website.' : 'Draft saved successfully.')
      await onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The product could not be saved. Please try again.')
    } finally { setBusy(false) }
  }

  async function deleteProduct() {
    if (!supabase || !productId || !window.confirm('Delete this product? This cannot be undone.')) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('products').delete().eq('id', productId)
    if (deleteError) setError(deleteError.message)
    else { await refresh(); navigate('/admin/products') }
    setBusy(false)
  }

  return <section className="editor-view"><div className="editor-heading"><Link to="/admin/products" className="back-link"><ArrowLeft size={15} /> All products</Link><p className="eyebrow">{productId ? 'PRODUCT DETAILS' : 'ADD TO YOUR COLLECTION'}</p><h1>{productId ? 'Edit product' : 'Add a product'}<span className="brand-period">.</span></h1><p>{productId ? 'Make a change. It’ll be live as soon as you save.' : 'A thoughtful find, ready to be discovered.'}</p></div>
    <form className="editor-form" onSubmit={(event) => void submit(event)}><div className="editor-fields"><label className="field-label">Product name <span>*</span><input required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. The everyday carry-all" /></label>
      <label className="field-label">Product description <span>*</span><textarea required maxLength={10000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What makes this one worth knowing about?" /></label>
      <label className="field-label">Purchase link <span>*</span><div className="input-with-icon"><LinkIcon size={16} /><input required type="url" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} placeholder="https://" /></div><small>Use a complete external link beginning with http:// or https://.</small></label>
      <div className="field-row"><label className="field-label">Price <span className="optional-label">OPTIONAL</span><div className="price-input"><span>$</span><input type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" /></div></label>
        <label className="field-label">Category <span className="optional-label">OPTIONAL</span><div className="select-wrap"><select value={createCategory ? '__new__' : categoryId} onChange={(event) => { setCreateCategory(event.target.value === '__new__'); if (event.target.value !== '__new__') setCategoryId(event.target.value) }}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}<option value="__new__">+ Create new category</option></select><ChevronDown size={15} /></div>{createCategory && <input className="new-category-input" required value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category name" />}</label></div>
      <label className="field-label">Tags <span className="optional-label">OPTIONAL</span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Separate tags with commas" /></label></div>
      <aside className="editor-side"><div className="image-upload-block"><span className="field-caption">PRODUCT IMAGE</span><label className={`image-dropzone ${previewUrl ? 'has-preview' : ''}`}><input type="file" accept="image/*" onChange={chooseImage} /><span className="upload-placeholder"><Upload size={19} /><strong>{previewUrl ? 'Replace image' : 'Choose an image'}</strong><small>PNG, JPG, AVIF or WEBP · max 15 MB</small></span>{previewUrl && <img src={previewUrl} alt="Product preview" />}</label><span className="image-tip">Images are resized and optimized to WebP before upload.</span></div>
        <div className="editor-option"><div><strong>Featured product</strong><small>Include this find in the homepage edit.</small></div><button type="button" className={`toggle ${featured ? 'on' : ''}`} role="switch" aria-checked={featured} aria-label="Featured product" onClick={() => setFeatured(!featured)}><span /></button></div>
        <label className="field-label status-field">Product status <span className="optional-label">VISIBILITY</span><div className="select-wrap"><select value={status} onChange={(event) => setStatus(event.target.value as Product['status'])}><option value="draft">Draft · hidden from visitors</option><option value="published">Published · visible on website</option></select><ChevronDown size={15} /></div></label><div className="editor-preview-link"><Eye size={15} /><span>{status === 'published' ? 'This product will be visible to everyone.' : 'Only administrators can see drafts.'}</span></div></aside>
      {error && <p className="form-error editor-message" role="alert">{error}</p>}{notice && <p className="form-success editor-message" role="status"><Check size={15} />{notice}</p>}
      <div className="editor-actions"><div>{productId && <button type="button" className="delete-button" onClick={() => void deleteProduct()} disabled={busy}><Trash2 size={15} /> Delete product</button>}</div><div><Link className="cancel-button" to="/admin/products">Cancel</Link><button className="dark-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={16} />}{busy ? 'Saving' : status === 'published' ? 'Publish product' : 'Save draft'}</button></div></div>
    </form></section>
}