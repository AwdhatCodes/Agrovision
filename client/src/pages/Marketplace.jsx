import React, { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, X, ShieldCheck, Leaf, ChevronDown, AlertTriangle, Lock } from 'lucide-react'

const CATEGORIES = ['seed', 'fertiliser', 'produce']
const REGIONS = ['Northern Region', 'Southern Region', 'Eastern Region', 'Western Region']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
]

const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.08)', watch: 'rgba(251,191,36,0.08)', outbreak: 'rgba(248,113,113,0.08)' }

function RegionRiskBadge({ riskLevel }) {
  if (!riskLevel || riskLevel === 'safe') return null
  const color = RISK_COLORS[riskLevel]
  const bg = RISK_BG[riskLevel]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: bg, border: `1px solid ${color}30`, fontSize: 11, color }}>
      <AlertTriangle size={10} />
      {riskLevel === 'outbreak' ? 'Outbreak zone' : 'Watch zone'}
    </div>
  )
}

function ProductCard({ product }) {
  const isQuarantined = product.quarantined === 1
  const hasRegionRisk = product.region_risk && product.region_risk !== 'safe'
  const riskBorderColor = hasRegionRisk ? RISK_COLORS[product.region_risk] : 'var(--border)'

  return (
    <div className="card" style={{
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.15s, box-shadow 0.15s',
      borderColor: hasRegionRisk ? `${riskBorderColor}50` : 'var(--border)',
      opacity: isQuarantined ? 0.6 : 1,
    }}
      onMouseEnter={e => { if (!isQuarantined) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ height: 160, background: 'var(--bg3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isQuarantined ? 'grayscale(0.8)' : 'none' }} />
          : <Leaf size={48} style={{ opacity: 0.15 }} />
        }
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span className={`tag tag-${product.category}`}>{product.category}</span>
        </div>
        {product.disease_safe === 1 && !hasRegionRisk && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span className="badge badge-green"><ShieldCheck size={10} /> Safe</span>
          </div>
        )}
        {hasRegionRisk && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span className="badge badge-red"><AlertTriangle size={10} /> {product.region_risk}</span>
          </div>
        )}
        {isQuarantined && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Lock size={28} color="#f87171" />
            <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>Quarantined</span>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{product.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text2)', fontSize: 12, flexWrap: 'wrap' }}>
            <span>{product.farm_name}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>{product.region}</span>
          </div>
        </div>
        {hasRegionRisk && <RegionRiskBadge riskLevel={product.region_risk} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="star">★</span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{product.rating?.toFixed(1)}</span>
          <span style={{ marginLeft: 'auto' }}><span className={`tag tag-${product.disease_risk_tag}`}>⚡ {product.disease_risk_tag} risk</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 20, color: isQuarantined ? 'var(--text3)' : 'var(--accent)' }}>${product.price.toFixed(2)}</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Qty: {product.quantity}</span>
        </div>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category: '', region: '', disease_safe: false, sort: 'newest' })
  const [showFilters, setShowFilters] = useState(false)
  const [regionRisks, setRegionRisks] = useState({})

  useEffect(() => {
    fetch('/api/regions/disease-risk').then(r => r.json()).then(data => {
      const map = {}
      data.forEach(r => { map[r.region] = r })
      setRegionRisks(map)
    })
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filters.category) params.set('category', filters.category)
      if (filters.region) params.set('region', filters.region)
      if (filters.disease_safe) params.set('disease_safe', 'true')
      params.set('sort', filters.sort)
      const res = await fetch(`/api/products?${params}`)
      setProducts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [search, filters])

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchProducts, search])

  const clearFilters = () => setFilters({ category: '', region: '', disease_safe: false, sort: 'newest' })
  const hasFilters = filters.category || filters.region || filters.disease_safe || filters.sort !== 'newest'

  const outbreakRegions = Object.values(regionRisks).filter(r => r.risk_level === 'outbreak')
  const watchRegions = Object.values(regionRisks).filter(r => r.risk_level === 'watch')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Agricultural Marketplace</h1>
        <p style={{ color: 'var(--text2)' }}>Discover seeds, fertilisers, and produce from verified farms</p>
      </div>

      {outbreakRegions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: 20, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 2 }}>Disease Outbreak Alert</p>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>
              Active outbreaks in: <strong>{outbreakRegions.map(r => r.region).join(', ')}</strong>. Products from these regions may be quarantined.
            </p>
          </div>
        </div>
      )}
      {watchRegions.length > 0 && outbreakRegions.length === 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 20, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginBottom: 2 }}>Disease Watch Advisory</p>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>
              Elevated disease activity in: <strong>{watchRegions.map(r => r.region).join(', ')}</strong>. Exercise caution.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name or farm name..." style={{ paddingLeft: 42, paddingRight: search ? 42 : 14 }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={{ width: 'auto', paddingRight: 36, appearance: 'none' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
        <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(s => !s)} style={{ whiteSpace: 'nowrap' }}>
          <SlidersHorizontal size={15} />
          Filters
          {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilters ? '#0a1a0f' : 'var(--accent)', marginLeft: 2 }} />}
        </button>
      </div>

      {showFilters && (
        <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 180px' }}>
            <label>Category</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label>Region</label>
            <select value={filters.region} onChange={e => setFilters(f => ({ ...f, region: e.target.value }))}>
              <option value="">All Regions</option>
              {REGIONS.map(r => {
                const risk = regionRisks[r]
                const icon = risk?.risk_level === 'outbreak' ? '🔴' : risk?.risk_level === 'watch' ? '🟡' : '🟢'
                return <option key={r} value={r}>{icon} {r}</option>
              })}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div onClick={() => setFilters(f => ({ ...f, disease_safe: !f.disease_safe }))} style={{ width: 40, height: 22, borderRadius: 99, position: 'relative', cursor: 'pointer', background: filters.disease_safe ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: filters.disease_safe ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} color="var(--accent)" /> Disease-safe farms only
              </span>
            </label>
          </div>
          {hasFilters && (
            <button className="btn btn-ghost" onClick={clearFilters} style={{ color: 'var(--text3)', fontSize: 12 }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
          <p style={{ color: 'var(--text3)' }}>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <Search size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No products found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16 }}>{products.length} product{products.length !== 1 ? 's' : ''} found</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  )
}
