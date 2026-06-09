import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal, X, ShieldCheck, Leaf, ChevronDown, AlertTriangle, Lock, MapPin, Star, Navigation, Award, CreditCard, Smartphone, Wallet, CheckCircle, ShoppingCart, Trash2, Plus, Minus, Pencil } from 'lucide-react'

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
const formatKsh = value => `KSh ${Number(value || 0).toLocaleString()}`
const KENYA_PLACES = [
  { name: 'Ngong', county: 'Kajiado County', lat: -1.3527, lng: 36.6699 },
  { name: 'Ongata Rongai', county: 'Kajiado County', lat: -1.3976, lng: 36.7649 },
  { name: 'Karen', county: 'Nairobi County', lat: -1.3197, lng: 36.7061 },
  { name: 'Kiserian', county: 'Kajiado County', lat: -1.4282, lng: 36.6867 },
  { name: 'Nairobi', county: 'Nairobi County', lat: -1.2864, lng: 36.8172 },
  { name: 'Kikuyu', county: 'Kiambu County', lat: -1.2463, lng: 36.6629 },
]

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function localLocationLabel(lat, lng) {
  const nearest = KENYA_PLACES
    .map(place => ({ ...place, distance: distanceKm(lat, lng, place.lat, place.lng) }))
    .sort((a, b) => a.distance - b.distance)[0]
  const region = nearest && nearest.distance <= 35 ? `${nearest.name}, ${nearest.county}` : 'Precise coordinates'
  return `${region} (${lat.toFixed(5)}, ${lng.toFixed(5)})`
}

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

const PAYMENT_METHODS = [
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'paypal', label: 'PayPal', icon: Wallet },
]

function CheckoutModal({ product, buyerLocation, onClose, onPaid }) {
  const [method, setMethod] = useState('mpesa')
  const [form, setForm] = useState({ buyer_name: '', buyer_region: buyerLocation?.region || '', quantity: 1, phone: '', email: '', card_last4: '' })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const quantity = Math.max(1, Math.min(parseInt(form.quantity) || 1, product.quantity || 1))
  const total = Math.round(product.price * quantity * 100) / 100

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        quantity,
        product_id: product.id,
        payment_method: method,
        buyer_lat: buyerLocation?.lat,
        buyer_lng: buyerLocation?.lng,
        buyer_location: buyerLocation?.label,
      })
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || 'Payment failed')
      return
    }
    setResult(data)
    onPaid()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Checkout</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{product.name}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {result ? (
            <div style={{ textAlign: 'center', padding: '26px 10px' }}>
              <CheckCircle size={42} color="var(--accent)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Payment received</p>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>Reference: {result.payment_reference}</p>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: 13, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{product.farm_name}</p>
                  <p style={{ color: 'var(--text3)', fontSize: 12 }}>{product.region}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>Total</p>
                  <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>{formatKsh(total)}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setMethod(id)} className={method === id ? 'btn btn-primary' : 'btn btn-secondary'} style={{ justifyContent: 'center', minHeight: 42 }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12 }}>
                <div className="form-group">
                  <label>Buyer Name</label>
                  <input value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} placeholder="Your name" required />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="1" max={product.quantity} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label>Buyer Location</label>
                <input value={buyerLocation?.label || form.buyer_region} onChange={e => setForm(f => ({ ...f, buyer_region: e.target.value }))} placeholder="Use My location to save exact coordinates" readOnly={!!buyerLocation?.label} />
              </div>

              {method === 'mpesa' && (
                <div className="form-group">
                  <label>M-Pesa Phone Number</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0712345678" required />
                </div>
              )}
              {method === 'card' && (
                <div className="form-group">
                  <label>Card Last 4 Digits</label>
                  <input value={form.card_last4} onChange={e => setForm(f => ({ ...f, card_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="1234" required />
                </div>
              )}
              {method === 'paypal' && (
                <div className="form-group">
                  <label>PayPal Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="buyer@example.com" required />
                </div>
              )}

              {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={saving || product.quantity < 1}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CreditCard size={14} />} Pay {formatKsh(total)}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function CartModal({ items, buyerLocation, onClose, onUpdateQty, onRemove, onClear, onPaid }) {
  const [method, setMethod] = useState('mpesa')
  const [form, setForm] = useState({ buyer_name: '', buyer_region: buyerLocation?.region || '', phone: '', email: '', card_last4: '' })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const total = Math.round(items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100) / 100

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/checkout-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        payment_method: method,
        buyer_lat: buyerLocation?.lat,
        buyer_lng: buyerLocation?.lng,
        buyer_location: buyerLocation?.label,
        items: items.map(item => ({ product_id: item.product.id, quantity: item.quantity }))
      })
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || 'Cart checkout failed')
      return
    }
    setResult(data)
    onPaid()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Cart</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {result ? (
            <div style={{ textAlign: 'center', padding: '26px 10px' }}>
              <CheckCircle size={42} color="var(--accent)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Cart payment received</p>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>Reference: {result.payment_reference}</p>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
              <ShoppingCart size={36} style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontWeight: 600, color: 'var(--text2)' }}>Your cart is empty</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto' }}>
                {items.map(({ product, quantity }) => (
                  <div key={product.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', padding: 12, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                      <p style={{ color: 'var(--text3)', fontSize: 11 }}>{product.farm_name} · {formatKsh(product.price)} each</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => onUpdateQty(product.id, quantity - 1)} style={{ padding: 6 }}><Minus size={13} /></button>
                      <span style={{ width: 22, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{quantity}</span>
                      <button type="button" className="btn btn-secondary" onClick={() => onUpdateQty(product.id, quantity + 1)} disabled={quantity >= product.quantity} style={{ padding: 6 }}><Plus size={13} /></button>
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => onRemove(product.id)} style={{ padding: 6, color: 'var(--danger)' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 13, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={onClear} style={{ color: 'var(--text3)', fontSize: 12 }}>Clear cart</button>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text3)', fontSize: 11 }}>Cart total</p>
                  <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>{formatKsh(total)}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => setMethod(id)} className={method === id ? 'btn btn-primary' : 'btn btn-secondary'} style={{ justifyContent: 'center', minHeight: 42 }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Buyer Name</label>
                  <input value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} placeholder="Your name" required />
                </div>
                <div className="form-group">
                  <label>Buyer Location</label>
                  <input value={buyerLocation?.label || form.buyer_region} onChange={e => setForm(f => ({ ...f, buyer_region: e.target.value }))} placeholder="Use My location to save exact coordinates" readOnly={!!buyerLocation?.label} />
                </div>
              </div>

              {method === 'mpesa' && <div className="form-group"><label>M-Pesa Phone Number</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0712345678" required /></div>}
              {method === 'card' && <div className="form-group"><label>Card Last 4 Digits</label><input value={form.card_last4} onChange={e => setForm(f => ({ ...f, card_last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="1234" required /></div>}
              {method === 'paypal' && <div className="form-group"><label>PayPal Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="buyer@example.com" required /></div>}

              {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
              <button type="submit" className="btn btn-primary" disabled={saving || !items.length}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <CreditCard size={14} />} Pay {formatKsh(total)}
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

function ProductCard({ product, isAdmin, onEdit, onCheckout, onAddToCart }) {
  const isQuarantined = product.quarantined === 1
  const hasRegionRisk = product.region_risk && product.region_risk !== 'safe'
  const isCertified = product.certified_clean === 1
  const riskBorder = hasRegionRisk ? `${RISK_COLORS[product.region_risk]}50` : 'var(--border)'

  // Minimal card: name, price, small description
  const desc = product.description || `${BLIGHT_LABELS[product.disease_type] || 'Fungicide'} — suitable for controlling blight in potatoes.`
  return (
    <div className="card" style={{ padding: 14, borderColor: riskBorder, opacity: isQuarantined ? 0.65 : 1 }}>
      <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{product.name}</h3>
      <p style={{ margin: '6px 0', color: 'var(--text2)', fontSize: 13 }}>{desc}</p>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: isQuarantined ? 'var(--text3)' : 'var(--accent)' }}>{formatKsh(product.price)}</span>
        {product.quantity > 0 && !isQuarantined && (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{product.quantity} in stock</span>
        )}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isAdmin ? (
          <button type="button" className="btn btn-primary" onClick={() => onEdit?.(product)} style={{ flex: 1, minWidth: 120, justifyContent: 'center' }}>
            <Pencil size={14} /> Edit product
          </button>
        ) : isQuarantined ? (
          <span style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={12} /> Quarantined — unavailable
          </span>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={() => onCheckout?.(product)} disabled={product.quantity < 1} style={{ flex: 1, minWidth: 90, justifyContent: 'center' }}>
              <CreditCard size={14} /> Buy
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onAddToCart?.(product)} disabled={product.quantity < 1} style={{ flex: 1, minWidth: 90, justifyContent: 'center' }}>
              <ShoppingCart size={14} /> Add to cart
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Store({ user, onUserUpdate, onAdminAddProduct, onAdminEditProduct }) {
  const isAdmin = user?.role?.toString().toLowerCase() === 'admin'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category: '', region: '', disease_safe: false, certified: false, sort: 'newest' })
  const [showFilters, setShowFilters] = useState(false)
  const [regionRisks, setRegionRisks] = useState({})
  const [buyerLoc, setBuyerLoc] = useState(user?.buyer_lat && user?.buyer_lng ? { lat: user.buyer_lat, lng: user.buyer_lng, region: user.buyer_region, label: user.buyer_location } : null)
  const [locLoading, setLocLoading] = useState(false)
  const [reviewProduct, setReviewProduct] = useState(null)
  const [checkoutProduct, setCheckoutProduct] = useState(null)
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    if (user?.buyer_lat && user?.buyer_lng) setBuyerLoc({ lat: user.buyer_lat, lng: user.buyer_lng, region: user.buyer_region, label: user.buyer_location })
  }, [user?.buyer_lat, user?.buyer_lng, user?.buyer_region, user?.buyer_location])

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
      params.set('category', 'fertiliser')
      if (filters.region) params.set('region', filters.region)
      if (filters.disease_safe) params.set('disease_safe', 'true')
      if (filters.certified) params.set('certified', 'true')
      params.set('sort', filters.sort)
      if (buyerLoc) { params.set('buyer_lat', buyerLoc.lat); params.set('buyer_lng', buyerLoc.lng) }
      const res = await fetch(`/api/products?${params}`)
      const all = await res.json()
      // Only show fungicides for Early or Late Blight
      const filtered = all.filter(p => p.category === 'fertiliser' && (p.disease_type === 'early_blight' || p.disease_type === 'late_blight'))
      setProducts(filtered)
    } finally { setLoading(false) }
  }, [search, filters, buyerLoc])

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchProducts, search])

  const detectLocation = () => {
    setLocLoading(true)
    const saveLocation = async (lat, lng) => {
      const token = localStorage.getItem('fm_token')
      if (!token) {
        setBuyerLoc({ lat, lng, label: localLocationLabel(lat, lng) })
        return
      }
      const res = await fetch('/api/users/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng })
      })
      if (res.ok) {
        const updated = await res.json()
        onUserUpdate?.(updated)
        setBuyerLoc({ lat: updated.buyer_lat, lng: updated.buyer_lng, region: updated.buyer_region, label: updated.buyer_location })
      } else {
        setBuyerLoc({ lat, lng, label: localLocationLabel(lat, lng) })
      }
    }
    navigator.geolocation.getCurrentPosition(
      pos => { saveLocation(pos.coords.latitude, pos.coords.longitude).finally(() => setLocLoading(false)) },
      () => { saveLocation(-1.2921, 36.8219).finally(() => setLocLoading(false)) }
    )
  }

  const clearFilters = () => setFilters({ category: '', region: '', disease_safe: false, certified: false, sort: 'newest' })
  const hasFilters = filters.category || filters.region || filters.disease_safe || filters.certified || filters.sort !== 'newest'
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = Math.round(cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0) * 100) / 100

  const addToCart = (product) => {
    setCart(items => {
      const existing = items.find(item => item.product.id === product.id)
      if (existing) {
        return items.map(item => item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) } : item)
      }
      return [...items, { product, quantity: 1 }]
    })
    setShowCart(true)
  }

  const updateCartQty = (productId, quantity) => {
    setCart(items => items.flatMap(item => {
      if (item.product.id !== productId) return [item]
      if (quantity < 1) return []
      return [{ ...item, quantity: Math.min(quantity, item.product.quantity) }]
    }))
  }

  const removeFromCart = (productId) => setCart(items => items.filter(item => item.product.id !== productId))
  const clearCart = () => setCart([])
  const handleCartPaid = () => {
    clearCart()
    fetchProducts()
  }

  const outbreakRegions = Object.values(regionRisks).filter(r => r.risk_level === 'outbreak')
  const watchRegions = Object.values(regionRisks).filter(r => r.risk_level === 'watch')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>Store</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>
            {isAdmin
              ? 'Manage store fungicides — use Edit on a product or Add Product to update listings.'
              : 'Only potato fungicides for Early and Late Blight are available here.'}
          </p>
        </div>
        {isAdmin && onAdminAddProduct && (
          <button type="button" className="btn btn-primary" onClick={onAdminAddProduct} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Plus size={14} /> Add Product
          </button>
        )}
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
          {buyerLoc?.label || (buyerLoc ? 'Location set' : 'My location')}
        </button>
        <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(s => !s)} style={{ whiteSpace: 'nowrap' }}>
          <SlidersHorizontal size={14} /> Filters {hasFilters && <span style={{ width: 5, height: 5, borderRadius: '50%', background: showFilters ? '#0a1a0f' : 'var(--accent)' }} />}
        </button>
        {!isAdmin && (
          <button className={cartCount ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setShowCart(true)} style={{ whiteSpace: 'nowrap', position: 'relative' }}>
            <ShoppingCart size={14} /> Cart
            {cartCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 99, background: cartCount ? '#0a1a0f' : 'var(--bg3)', color: cartCount ? 'var(--accent)' : 'var(--text3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{cartCount}</span>}
            {cartTotal > 0 && <span style={{ fontSize: 11, opacity: 0.8 }}>{formatKsh(cartTotal)}</span>}
          </button>
        )}
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
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                isAdmin={isAdmin}
                onEdit={onAdminEditProduct}
                onCheckout={isAdmin ? undefined : setCheckoutProduct}
                onAddToCart={isAdmin ? undefined : addToCart}
              />
            ))}
          </div>
        </>
      )}

      {!isAdmin && reviewProduct && <ReviewModal product={reviewProduct} onClose={() => { setReviewProduct(null); fetchProducts() }} />}
      {!isAdmin && checkoutProduct && <CheckoutModal product={checkoutProduct} buyerLocation={buyerLoc || (user?.buyer_lat && user?.buyer_lng ? { lat: user.buyer_lat, lng: user.buyer_lng, region: user.buyer_region, label: user.buyer_location } : null)} onClose={() => setCheckoutProduct(null)} onPaid={fetchProducts} />}
      {!isAdmin && showCart && <CartModal items={cart} buyerLocation={buyerLoc || (user?.buyer_lat && user?.buyer_lng ? { lat: user.buyer_lat, lng: user.buyer_lng, region: user.buyer_region, label: user.buyer_location } : null)} onClose={() => setShowCart(false)} onUpdateQty={updateCartQty} onRemove={removeFromCart} onClear={clearCart} onPaid={handleCartPaid} />}
    </div>
  )
}
