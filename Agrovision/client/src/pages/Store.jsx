import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Leaf, AlertTriangle, Lock, MapPin, Star, Navigation, CreditCard, Smartphone, Wallet, CheckCircle, ShoppingCart, Trash2, Plus, Minus, Pencil } from 'lucide-react'

const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.08)', watch: 'rgba(251,191,36,0.08)', outbreak: 'rgba(248,113,113,0.08)' }
const BLIGHT_LABELS = { early_blight: 'Early Blight', late_blight: 'Late Blight', none: 'None' }
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
]
const DISEASE_TYPES = [
  { value: 'early_blight', label: 'Early Blight' },
  { value: 'late_blight', label: 'Late Blight' },
]
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
              <div style={{ padding: '14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Total</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>{formatKsh(total)}</span>
              </div>
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

function ProductCard({ product, isAdmin, recommended, onEdit, onCheckout, onAddToCart, onDelete }) {
  const isQuarantined = product.quarantined === 1
  const desc = product.description || 'Potato blight control product for healthy crops.'
  return (
    <div className="card" style={{ padding: 14, borderColor: isQuarantined ? 'rgba(248,113,113,0.35)' : 'var(--border)', opacity: isQuarantined ? 0.65 : 1 }}>
      {product.image_url && (
        <div style={{ marginBottom: 12, borderRadius: 14, overflow: 'hidden', height: 150, background: '#ffffff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      )}
      <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{product.name}</h3>
      <p style={{ margin: '6px 0', color: 'var(--text2)', fontSize: 13 }}>{desc}</p>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: isQuarantined ? 'var(--text3)' : 'var(--accent)' }}>{formatKsh(product.price)}</span>
        {isQuarantined && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)', background: 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(248,113,113,0.2)' }}>🔒 Quarantined</span>}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 20 }}>
        {product.quantity > 0 && !isQuarantined && (
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{product.quantity} in stock</span>
        )}
        {recommended && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: 'rgba(74,222,128,0.14)', padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(74,222,128,0.2)' }}>
            Recommended
          </span>
        )}
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isAdmin ? (
          <>
            <button type="button" className="btn btn-primary" onClick={() => onEdit?.(product)} style={{ flex: 1, minWidth: 120, justifyContent: 'center' }}>
              <Pencil size={14} /> Edit
            </button>
            <button type="button" className="btn btn-danger" onClick={() => onDelete?.(product)} style={{ flex: 1, minWidth: 120, justifyContent: 'center' }}>
              <Trash2 size={14} /> Delete
            </button>
          </>
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
  const [sort, setSort] = useState('newest')
  const [regionRisks, setRegionRisks] = useState({})
  const [farms, setFarms] = useState([])
  const [showAdminProductForm, setShowAdminProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [adminProductForm, setAdminProductForm] = useState({ name: '', description: '', price: '', quantity: '', farm_id: '', disease_type: 'early_blight', disease_risk_tag: 'low', category: 'fertiliser', image: null, image_url: '' })
  const [productError, setProductError] = useState('')
  const [productSaving, setProductSaving] = useState(false)
  const [buyerLoc, setBuyerLoc] = useState(user?.buyer_lat && user?.buyer_lng ? { lat: user.buyer_lat, lng: user.buyer_lng, region: user.buyer_region, label: user.buyer_location } : null)
  const [locLoading, setLocLoading] = useState(false)
  const recentDiagnosisType = user?.recentDiagnosis?.disease_type || user?.recentDiagnosis?.diagnosis || user?.recentDiagnosis?.label || user?.recentDiagnosis?.result || ''
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
    fetch('/api/farms').then(r => r.ok ? r.json() : []).then(data => setFarms(Array.isArray(data) ? data : [])).catch(() => setFarms([]))
  }, [])

  const openEditProduct = (product) => {
    setEditingProduct(product)
    setProductError('')
    setAdminProductForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      quantity: String(product.quantity ?? ''),
      farm_id: product.farm_id || farms[0]?.id || '',
      disease_type: product.disease_type || 'early_blight',
      disease_risk_tag: product.disease_risk_tag || 'low',
      category: product.category || 'fertiliser',
      image: null,
      image_url: product.image_url || '',
    })
    setShowAdminProductForm(true)
  }

  const closeProductForm = () => {
    setShowAdminProductForm(false)
    setEditingProduct(null)
    setProductError('')
  }

  const saveAdminProduct = async (e) => {
    e.preventDefault()
    if (!adminProductForm.name || !adminProductForm.price || !adminProductForm.quantity || !adminProductForm.farm_id) {
      setProductError('Please complete the required product fields.')
      return
    }
    setProductSaving(true)
    try {
      const targetUrl = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const formData = new FormData()
      formData.append('name', adminProductForm.name)
      formData.append('description', adminProductForm.description)
      formData.append('category', adminProductForm.category)
      formData.append('price', adminProductForm.price)
      formData.append('quantity', adminProductForm.quantity)
      formData.append('farm_id', adminProductForm.farm_id)
      formData.append('disease_type', adminProductForm.disease_type)
      formData.append('disease_risk_tag', adminProductForm.disease_risk_tag)
      if (adminProductForm.image) {
        formData.append('image', adminProductForm.image)
      }
      const res = await fetch(targetUrl, {
        method,
        body: formData,
      })
      let data
      try {
        data = await res.json()
      } catch (parseErr) {
        const text = await res.text()
        data = { error: text || parseErr.message }
      }
      if (!res.ok) throw new Error(data.error || `Unable to save product (${res.status})`)
      closeProductForm()
      fetchProducts()
    } catch (err) {
      console.error('Admin product save failed', err)
      setProductError(err.message || 'Could not save product')
    } finally {
      setProductSaving(false)
    }
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('category', 'fertiliser')
      params.set('sort', sort)
      if (!isAdmin && buyerLoc) { params.set('buyer_lat', buyerLoc.lat); params.set('buyer_lng', buyerLoc.lng) }
      const res = await fetch(`/api/products?${params}`)
      const all = await res.json()
      // Only show fungicides for Early or Late Blight
      const filtered = all.filter(p => p.category === 'fertiliser' && (p.disease_type === 'early_blight' || p.disease_type === 'late_blight'))
      const sorted = [...filtered].sort((a, b) => {
        if (sort === 'price_low') return Number(a.price) - Number(b.price)
        if (sort === 'price_high') return Number(b.price) - Number(a.price)
        return (b.created_at || '').localeCompare(a.created_at || '')
      })
      setProducts(sorted)
    } finally { setLoading(false) }
  }, [search, sort, buyerLoc, isAdmin])

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

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete product “${product.name}”? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
      fetchProducts()
    } catch (err) {
      console.error('Delete product failed', err)
      window.alert(err.message || 'Unable to delete product')
    }
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
              ? 'Manage store fungicides — use Edit on a product here or go to the Admin Panel to add new listings.'
              : 'Only potato fungicides for Early and Late Blight are available here.'}
          </p>
        </div>
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

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or farm name..." style={{ paddingLeft: 44, paddingRight: search ? 40 : 14, width: '100%', height: 42, fontSize: 14, borderRadius: 10 }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 4 }}><X size={16} /></button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>Showing all approved products</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label htmlFor="sort-select" style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap' }}>Sort by:</label>
              <select id="sort-select" value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 12px', minWidth: 150, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500 }}>
                {SORT_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
            </div>
            {!isAdmin && (
              <button className={cartCount ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setShowCart(true)} style={{ whiteSpace: 'nowrap', position: 'relative', marginLeft: 'auto' }}>
                <ShoppingCart size={14} /> Cart
                {cartCount > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 99, background: cartCount ? '#0a1a0f' : 'var(--bg3)', color: cartCount ? 'var(--accent)' : 'var(--text3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{cartCount}</span>}
                {cartTotal > 0 && <span style={{ fontSize: 11, opacity: 0.8 }}>{formatKsh(cartTotal)}</span>}
              </button>
            )}
          </div>
        </div>
      </div>


      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 14px', width: 30, height: 30 }} />
          <p style={{ color: 'var(--text3)' }}>Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <Search size={44} style={{ margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>No products found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search</p>
        </div>
      ) : (
        <>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 14 }}>
            {products.length} product{products.length !== 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))', gap: 18 }}>
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                isAdmin={isAdmin}
                recommended={!isAdmin && recentDiagnosisType && p.disease_type === recentDiagnosisType}
                onEdit={openEditProduct}
                onDelete={handleDeleteProduct}
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

      {showAdminProductForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeProductForm()}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>{editingProduct ? 'Edit Store Product' : 'Add Store Product'}</h2>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>{editingProduct ? 'Update a product listing for the store.' : 'Create a new fungicide product listing.'}</p>
              </div>
              <button className="btn btn-ghost" onClick={closeProductForm} style={{ padding: '4px 8px' }}><X size={16} /></button>
            </div>
            <form className="modal-body" onSubmit={saveAdminProduct} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Product Name</label>
                  <input value={adminProductForm.name} onChange={e => setAdminProductForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Potato Blight Guard" required />
                </div>
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" min="0" value={adminProductForm.price} onChange={e => setAdminProductForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 3400" required />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={adminProductForm.description} onChange={e => setAdminProductForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Effective fungicide for controlling early and late blight..." style={{ minHeight: 80, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="0" value={adminProductForm.quantity} onChange={e => setAdminProductForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 10" required />
                </div>
              </div>



              <div style={{ display: 'grid', gap: 12 }}>
                <div className="form-group">
                  <label>Product Image</label>
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0] || null
                    setAdminProductForm(f => ({ ...f, image: file, image_url: file ? URL.createObjectURL(file) : f.image_url }))
                  }} />
                </div>
                {(adminProductForm.image_url || adminProductForm.image) && (
                  <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: '#ffffff', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={adminProductForm.image_url} alt="Product preview" style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }} />
                  </div>
                )}
              </div>

              {productError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{productError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={closeProductForm} style={{ minWidth: 110 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={productSaving} style={{ minWidth: 110 }}>
                  {productSaving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : editingProduct ? 'Save Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}