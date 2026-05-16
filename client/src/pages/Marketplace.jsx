import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal, X, ShieldCheck, Leaf, ChevronDown, AlertTriangle, Lock, MapPin, Star, Navigation, Award, ChevronUp } from 'lucide-react'

const CATEGORIES = ['seed', 'fertiliser', 'produce']
const REGIONS = ['Northern Region', 'Southern Region', 'Eastern Region', 'Western Region']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'proximity', label: 'Nearest Farm' },
]

const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.08)', watch: 'rgba(251,191,36,0.08)', outbreak: 'rgba(248,113,113,0.08)' }
const BLIGHT_LABELS = { early_blight: 'Early Blight', late_blight: 'Late Blight', none: 'None' }

function StarRating({ rating, count, size = 12 }) {
  const filled = Math.round(rating || 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={size} fill={i <= filled ? '#fbbf24' : 'none'} color={i <= filled ? '#fbbf24' : '#3a4060'} />
        ))}
      </div>
      <span style={{ fontSize: size, color: 'var(--text3)' }}>
        {rating ? `${parseFloat(rating).toFixed(1)}` : 'No reviews'}
        {count > 0 && <span style={{ marginLeft: 2 }}>({count})</span>}
      </span>
    </div>
  )
}

function ReviewModal({ product, onClose }) {
  const [form, setForm] = useState({ rating: 5, comment: '', buyer_name: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    fetch(`/api/reviews?product_id=${product.id}&approved=1`).then(r => r.json()).then(setReviews)
  }, [product.id])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, product_id: product.id }) })
    setSaving(false)
    setDone(true)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>{product.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Reviews & Ratings</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {reviews.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <StarRating rating={r.rating} count={0} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.buyer_name}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
          {done ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--accent)' }}>
              <Star size={32} fill="currentColor" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontWeight: 600 }}>Review submitted!</p>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Thank you for your feedback.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: reviews.length ? '1px solid var(--border)' : 'none', paddingTop: reviews.length ? 16 : 0 }}>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Leave a Review</p>
              <div className="form-group">
                <label>Your Name</label>
                <input value={form.buyer_name} onChange={e => setForm(f => ({...f, buyer_name: e.target.value}))} placeholder="e.g. Emeka O." required />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onClick={() => setForm(f => ({...f, rating: i}))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Star size={24} fill={i <= form.rating ? '#fbbf24' : 'none'} color={i <= form.rating ? '#fbbf24' : '#3a4060'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Comment (optional)</label>
                <textarea value={form.comment} onChange={e => setForm(f => ({...f, comment: e.target.value}))} placeholder="Share your experience with this product..." rows={3} style={{ resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving || !form.buyer_name}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Star size={14} />} Submit Review
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function DeliveryBadge({ distKm }) {
  if (!distKm && distKm !== 0) return null
  const days = distKm < 100 ? 1 : distKm < 400 ? 2 : distKm < 800 ? 3 : 5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(96,165,250,0.2)' }}>
      <Navigation size={9} /> ~{distKm} km · est. {days} day{days > 1 ? 's' : ''}
    </div>
  )
}

function ProductCard({ product, onReview }) {
  const isQuarantined = product.quarantined === 1
  const hasRegionRisk = product.region_risk && product.region_risk !== 'safe'
  const isCertified = product.certified_clean === 1
  const riskBorder = hasRegionRisk ? `${RISK_COLORS[product.region_risk]}50` : 'var(--border)'

  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.15s, box-shadow 0.15s', borderColor: riskBorder, opacity: isQuarantined ? 0.65 : 1 }}
      onMouseEnter={e => { if (!isQuarantined) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
    >
      <div style={{ height: 156, background: 'var(--bg3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {product.image_url
          ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isQuarantined ? 'grayscale(0.8)' : 'none' }} />
          : <Leaf size={44} style={{ opacity: 0.13 }} />}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span className={`tag tag-${product.category}`}>{product.category}</span>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          {isCertified && !hasRegionRisk && (
            <span className="badge badge-green" style={{ fontSize: 10 }}><Award size={9} /> Certified</span>
          )}
          {hasRegionRisk && (
            <span className="badge badge-red" style={{ fontSize: 10 }}><AlertTriangle size={9} /> {product.region_risk}</span>
          )}
        </div>
        {isQuarantined && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Lock size={26} color="#f87171" /><span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>Quarantined</span>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, lineHeight: 1.3 }}>{product.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text3)', fontSize: 11 }}>
            <MapPin size={9} /><span>{product.farm_name}</span><span style={{ color: 'var(--border)' }}>·</span><span>{product.region}</span>
          </div>
        </div>
        {hasRegionRisk && (
          <div style={{ fontSize: 11, color: RISK_COLORS[product.region_risk], background: RISK_BG[product.region_risk], padding: '3px 8px', borderRadius: 5, border: `1px solid ${RISK_COLORS[product.region_risk]}25` }}>
            ⚠ {BLIGHT_LABELS[product.region_blight] || 'Disease'} detected in this region
          </div>
        )}
        <button onClick={() => onReview(product)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <StarRating rating={product.product_rating} count={product.review_count} />
        </button>
        {product.distance_km != null && <DeliveryBadge distKm={product.distance_km} />}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 19, color: isQuarantined ? 'var(--text3)' : 'var(--accent)' }}>${product.price.toFixed(2)}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Qty: {product.quantity}</span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span className={`tag tag-${product.disease_risk_tag}`} style={{ fontSize: 10 }}>⚡ {product.disease_risk_tag} risk</span>
          {product.disease_type && product.disease_type !== 'none' && (
            <span style={{ fontSize: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '2px 6px', borderRadius: 4 }}>
              {BLIGHT_LABELS[product.disease_type]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category: '', region: '', disease_safe: false, certified: false, sort: 'newest' })
  const [showFilters, setShowFilters] = useState(false)
  const [regionRisks, setRegionRisks] = useState({})
  const [buyerLoc, setBuyerLoc] = useState(null)
  const [locLoading, setLocLoading] = useState(false)
  const [reviewProduct, setReviewProduct] = useState(null)

  useEffect(() => {
    fetch('/api/regions/disease-risk').then(r => r.json()).then(data => {
      const map = {}; data.forEach(r => { map[r.region] = r }); setRegionRisks(map)
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
      if (filters.certified) params.set('certified', 'true')
      params.set('sort', filters.sort)
      if (buyerLoc) { params.set('buyer_lat', buyerLoc.lat); params.set('buyer_lng', buyerLoc.lng) }
      const res = await fetch(`/api/products?${params}`)
      setProducts(await res.json())
    } finally { setLoading(false) }
  }, [search, filters, buyerLoc])

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchProducts, search])

  const detectLocation = () => {
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setBuyerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false) },
      () => { setBuyerLoc({ lat: 8.0, lng: 7.5 }); setLocLoading(false) }
    )
  }

  const clearFilters = () => setFilters({ category: '', region: '', disease_safe: false, certified: false, sort: 'newest' })
  const hasFilters = filters.category || filters.region || filters.disease_safe || filters.certified || filters.sort !== 'newest'

  const outbreakRegions = Object.values(regionRisks).filter(r => r.risk_level === 'outbreak')
  const watchRegions = Object.values(regionRisks).filter(r => r.risk_level === 'watch')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>Potato Marketplace</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Seeds, fertilisers, and produce — AI-verified for Early & Late Blight</p>
      </div>

      {outbreakRegions.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '11px 16px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 8, marginBottom: 16 }}>
          <AlertTriangle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Blight Outbreak Alert — </span>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Active in: <strong>{outbreakRegions.map(r => `${r.region} (${BLIGHT_LABELS[r.blight_type]||'Blight'})`).join(', ')}</strong>. Affected listings quarantined.</span>
          </div>
        </div>
      )}
      {!outbreakRegions.length && watchRegions.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '11px 16px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, marginBottom: 16 }}>
          <AlertTriangle size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>Blight Watch — </span>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Elevated activity in: <strong>{watchRegions.map(r => r.region).join(', ')}</strong>. Exercise caution.</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or farm name..." style={{ paddingLeft: 40, paddingRight: search ? 40 : 14 }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>}
        </div>
        <div style={{ position: 'relative' }}>
          <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={{ width: 'auto', paddingRight: 34, appearance: 'none' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
        <button className="btn btn-secondary" onClick={detectLocation} disabled={locLoading} title={buyerLoc ? 'Location set — click to refresh' : 'Detect my location for delivery estimates'}
          style={{ whiteSpace: 'nowrap', borderColor: buyerLoc ? 'var(--accent)' : 'var(--border)', color: buyerLoc ? 'var(--accent)' : 'var(--text2)' }}>
          {locLoading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Navigation size={14} />}
          {buyerLoc ? 'Location set' : 'My location'}
        </button>
        <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(s => !s)} style={{ whiteSpace: 'nowrap' }}>
          <SlidersHorizontal size={14} /> Filters {hasFilters && <span style={{ width: 5, height: 5, borderRadius: '50%', background: showFilters ? '#0a1a0f' : 'var(--accent)' }} />}
        </button>
      </div>

      {showFilters && (
        <div className="card" style={{ padding: 18, marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label>Category</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 190px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 200px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
              <div onClick={() => setFilters(f => ({ ...f, certified: !f.certified }))} style={{ width: 36, height: 20, borderRadius: 99, position: 'relative', cursor: 'pointer', background: filters.certified ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: filters.certified ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
              <Award size={13} color="var(--accent)" /> Certified Clean only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
              <div onClick={() => setFilters(f => ({ ...f, disease_safe: !f.disease_safe }))} style={{ width: 36, height: 20, borderRadius: 99, position: 'relative', cursor: 'pointer', background: filters.disease_safe ? 'var(--accent)' : 'var(--bg3)', border: '1px solid var(--border)', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: filters.disease_safe ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
              <ShieldCheck size={13} color="var(--accent)" /> Disease-safe farms
            </label>
          </div>
          {hasFilters && <button className="btn btn-ghost" onClick={clearFilters} style={{ color: 'var(--text3)', fontSize: 12 }}><X size={12} /> Clear</button>}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 14px', width: 30, height: 30 }} />
          <p style={{ color: 'var(--text3)' }}>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <Search size={44} style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>No products found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 14 }}>
            {products.length} product{products.length !== 1 ? 's' : ''} found
            {buyerLoc && <span style={{ marginLeft: 8, color: 'var(--blue)' }}>· sorted by {filters.sort === 'proximity' ? 'distance' : 'selected order'} from your location</span>}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))', gap: 18 }}>
            {products.map(p => <ProductCard key={p.id} product={p} onReview={setReviewProduct} />)}
          </div>
        </>
      )}

      {reviewProduct && <ReviewModal product={reviewProduct} onClose={() => { setReviewProduct(null); fetchProducts() }} />}
    </div>
  )
}
