import React, { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Archive, Leaf, MapPin, Upload, X, Check, Clock, AlertTriangle, BarChart2, TrendingUp, Eye, DollarSign, ShoppingCart, Star } from 'lucide-react'

const CATEGORIES = ['seed', 'fertiliser', 'produce']
const RISK_TAGS = ['low', 'medium', 'high']
const DISEASE_TYPES = [{ value: 'none', label: 'None' }, { value: 'early_blight', label: 'Early Blight' }, { value: 'late_blight', label: 'Late Blight' }]

function statusBadge(status) {
  if (status === 'approved') return <span className="badge badge-green"><Check size={10} /> Live</span>
  if (status === 'pending') return <span className="badge badge-yellow"><Clock size={10} /> Pending</span>
  if (status === 'archived') return <span className="badge badge-gray">Archived</span>
  return null
}

function ProductForm({ farms, initial, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', category: initial?.category || 'seed',
    price: initial?.price || '', quantity: initial?.quantity || '',
    farm_id: initial?.farm_id || (farms[0]?.id || ''),
    disease_risk_tag: initial?.disease_risk_tag || 'low',
    disease_type: initial?.disease_type || 'none',
  })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (image) fd.append('image', image)
      await onSubmit(fd)
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{initial ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Product Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Certified Potato Seed (1kg)" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Blight Risk *</label>
                <select value={form.disease_risk_tag} onChange={e => set('disease_risk_tag', e.target.value)}>
                  {RISK_TAGS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)} Risk</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Disease Type</label>
              <select value={form.disease_type} onChange={e => set('disease_type', e.target.value)}>
                {DISEASE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price (USD) *</label>
                <input type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" required />
              </div>
              <div className="form-group">
                <label>Quantity *</label>
                <input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" required />
              </div>
            </div>
            <div className="form-group">
              <label>Farm *</label>
              <select value={form.farm_id} onChange={e => set('farm_id', e.target.value)} required>
                {farms.map(f => <option key={f.id} value={f.id}>{f.name} — {f.region}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Product Image</label>
              <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 18, textAlign: 'center', cursor: 'pointer', background: 'var(--bg3)', minHeight: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {preview ? (<><img src={preview} alt="preview" style={{ maxHeight: 120, borderRadius: 6, objectFit: 'cover' }} /><p style={{ fontSize: 11, color: 'var(--text3)' }}>Click to change</p></>) : (<><Upload size={22} style={{ color: 'var(--text3)' }} /><p style={{ fontSize: 12, color: 'var(--text2)' }}>Upload image</p><p style={{ fontSize: 11, color: 'var(--text3)' }}>PNG, JPG up to 5MB</p></>)}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setImage(f); setPreview(URL.createObjectURL(f)) } }} style={{ display: 'none' }} />
            </div>
            {!initial && (
              <div style={{ display: 'flex', gap: 8, padding: '9px 13px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8 }}>
                <AlertTriangle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>New listings require admin approval before appearing in the store.</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 13, height: 13 }} /> : null}
              {initial ? 'Save Changes' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MiniBar({ value, max, color = 'var(--accent)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function AnalyticsTab({ farmId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = farmId ? `/api/seller/analytics?farm_id=${farmId}` : '/api/seller/analytics'
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [farmId])

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto', width: 28, height: 28 }} /></div>
  if (!data) return null

  const maxRevenue = Math.max(...(data.byProduct?.map(p => p.revenue) || [1]))
  const maxMonth = Math.max(...(data.byMonth?.map(m => m.revenue) || [1]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Revenue', value: `KSh ${Number(data.totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'var(--accent)' },
          { label: 'Units Sold', value: data.totalSales, icon: ShoppingCart, color: 'var(--blue)' },
          { label: 'Product Views', value: data.totalViews, icon: Eye, color: 'var(--warning)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div><p style={{ fontSize: 22, fontWeight: 700 }}>{value}</p><p style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</p></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} color="var(--accent)" /> Revenue by Month
          </h3>
          {data.byMonth?.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>No sales data</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.byMonth?.map(m => (
                <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', width: 54, flexShrink: 0 }}>{m.month?.slice(2)}</span>
                  <MiniBar value={m.revenue} max={maxMonth} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', width: 78, textAlign: 'right', flexShrink: 0 }}>KSh {Number(m.revenue).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {data.alertImpact?.length > 0 && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 7 }}>
              <p style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>⚠ Disease Alert Impact</p>
              {data.alertImpact.slice(0, 3).map((a, i) => (
                <p key={i} style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
                  {a.created_at?.slice(0, 10)} — {a.severity === 'outbreak' ? '🔴' : '🟡'} {a.blight_type === 'late_blight' ? 'Late Blight' : 'Early Blight'} in {a.region}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart2 size={14} color="var(--blue)" /> Top Products
          </h3>
          {data.byProduct?.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>No sales data</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.byProduct?.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', width: 16, flexShrink: 0 }}>#{i+1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{p.name}</p>
                    <MiniBar value={p.revenue} max={maxRevenue} color='var(--blue)' />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', width: 78, textAlign: 'right', flexShrink: 0 }}>KSh {Number(p.revenue).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.byRegion?.length > 0 && (
        <div className="card" style={{ padding: '18px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} color="var(--warning)" /> Buyers by Region
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.byRegion.map(r => (
              <div key={r.buyer_region} style={{ flex: '1 1 180px', padding: '10px 14px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{r.buyer_region}</p>
                <p style={{ fontSize: 12, color: 'var(--accent)' }}>KSh {Number(r.revenue).toLocaleString()} revenue</p>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{r.units} units sold</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default function SellerDashboard() {
  const [products, setProducts] = useState([])
  const [farms, setFarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('products')
  const [listTab, setListTab] = useState('all')
  const [selectedFarm, setSelectedFarm] = useState('')
  const [locUpdating, setLocUpdating] = useState(false)
  const [locError, setLocError] = useState('')

  useEffect(() => {
    fetch('/api/farms').then(r => r.json()).then(f => { setFarms(f); if (f.length) setSelectedFarm(f[0].id) })
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const [a, p, ar] = await Promise.all([
        fetch('/api/products?status=approved').then(r => r.json()),
        fetch('/api/products?status=pending').then(r => r.json()),
        fetch('/api/products?status=archived').then(r => r.json()),
      ])
      setProducts([...a, ...p, ...ar])
    } finally { setLoading(false) }
  }

  const handleSubmit = async (fd) => {
    if (editing) await fetch(`/api/products/${editing.id}`, { method: 'PUT', body: fd })
    else await fetch('/api/products', { method: 'POST', body: fd })
    setShowForm(false); setEditing(null); loadProducts()
  }

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this product?')) return
    await fetch(`/api/products/${id}/archive`, { method: 'PATCH' }); loadProducts()
  }

  const filtered = products.filter(p => {
    if (listTab === 'approved') return p.status === 'approved'
    if (listTab === 'pending') return p.status === 'pending'
    if (listTab === 'archived') return p.status === 'archived'
    return true
  })
  const counts = { all: products.length, approved: products.filter(p => p.status==='approved').length, pending: products.filter(p => p.status==='pending').length, archived: products.filter(p => p.status==='archived').length }

  const TABS = [{ id: 'products', label: 'My Products' }, { id: 'analytics', label: 'Analytics' }]
  const LIST_TABS = [{ id: 'all', label: 'All' }, { id: 'approved', label: 'Live' }, { id: 'pending', label: 'Pending' }, { id: 'archived', label: 'Archived' }]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>Seller Dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Manage your potato store listings</p>
        </div>
        {tab === 'products' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
              <Plus size={15} /> Add Product
            </button>
            <button className="btn" onClick={async () => {
              setLocError('')
              if (!selectedFarm) return setLocError('Select a farm first')
              if (!navigator.geolocation) return setLocError('Geolocation not supported')
              setLocUpdating(true)
              navigator.geolocation.getCurrentPosition(async pos => {
                try {
                  const { latitude, longitude } = pos.coords
                  const res = await fetch(`/api/farms/${selectedFarm}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: latitude, lng: longitude })
                  })
                  if (!res.ok) {
                    const txt = await res.text()
                    throw new Error(txt || `Failed (${res.status})`)
                  }
                  // refresh farms list
                  fetch('/api/farms').then(r => r.ok ? r.json() : []).then(f => { setFarms(f); if (f.length && !selectedFarm) setSelectedFarm(f[0].id) })
                } catch (err) {
                  console.error('Set farm location failed', err)
                  setLocError(err.message || 'Location update failed')
                } finally { setLocUpdating(false) }
              }, err => { setLocError(err.message || 'Unable to get location'); setLocUpdating(false) }, { enableHighAccuracy: true, timeout: 20000 })
            }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}>
              {locUpdating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <MapPin size={14} />}
              Locate Farm
            </button>
            {locError && <span style={{ color: 'var(--danger)', fontSize: 12, marginLeft: 8 }}>{locError}</span>}
          </div>
        )}
        {/* Show selected farm coordinates */}
        {selectedFarm && (() => {
          const cf = farms.find(f => f.id === selectedFarm)
          return cf ? (
            <div style={{ width: '100%', marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <MapPin size={12} />
                {cf.lat && cf.lng ? (
                  <span>Location: {Number(cf.lat).toFixed(5)}, {Number(cf.lng).toFixed(5)}</span>
                ) : (
                  <span style={{ color: 'var(--text2)' }}>Location not set for this farm</span>
                )}
              </div>
            </div>
          ) : null
        })()}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.id === 'analytics' && <BarChart2 size={13} />}{t.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && (
        <div>
          {farms.length > 1 && (
            <div style={{ marginBottom: 18 }}>
              <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)} style={{ width: 'auto' }}>
                <option value="">All Farms</option>
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          <AnalyticsTab farmId={selectedFarm} />
        </div>
      )}

      {tab === 'products' && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
            {LIST_TABS.map(t => (
              <button key={t.id} onClick={() => setListTab(t.id)} style={{ padding: '7px 14px', background: 'none', border: 'none', borderBottom: listTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: listTab === t.id ? 'var(--accent)' : 'var(--text2)', fontWeight: listTab === t.id ? 600 : 400, fontSize: 12, cursor: 'pointer', marginBottom: -1 }}>
                {t.label} <span style={{ fontSize: 10, background: 'var(--bg3)', padding: '1px 6px', borderRadius: 99, color: 'var(--text3)' }}>{counts[t.id]}</span>
              </button>
            ))}
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto', width: 28, height: 28 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Leaf size={44} style={{ margin: '0 auto 14px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>No products yet</p>
              <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}><Plus size={14} /> Add Product</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(p => (
                <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', flexWrap: 'wrap', borderColor: p.quarantined ? 'rgba(248,113,113,0.3)' : 'var(--border)' }}>
                  <div style={{ width: 50, height: 50, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={20} style={{ opacity: 0.3 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontWeight: 600, marginBottom: 3, fontSize: 14 }}>{p.name}</p>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`tag tag-${p.category}`} style={{ fontSize: 10 }}>{p.category}</span>
                      {p.disease_type && p.disease_type !== 'none' && <span style={{ fontSize: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '2px 6px', borderRadius: 4 }}>{p.disease_type === 'early_blight' ? 'Early Blight' : 'Late Blight'}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} />{p.farm_name}</span>
                      {p.views > 0 && <span style={{ fontSize: 10, color: 'var(--text3)' }}><Eye style={{ display: 'inline', width: 9 }} /> {p.views}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>KSh {Number(p.price).toLocaleString()}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>Qty: {p.quantity}</p>
                  </div>
                  <div style={{ minWidth: 86 }}>{statusBadge(p.status)}{p.quarantined === 1 && <span className="badge badge-red" style={{ fontSize: 10, marginTop: 4, display: 'inline-flex' }}>Quarantined</span>}</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 9px' }} onClick={() => { setEditing(p); setShowForm(true) }}><Pencil size={13} /></button>
                    {p.status !== 'archived' && <button className="btn btn-danger" style={{ padding: '6px 9px' }} onClick={() => handleArchive(p.id)}><Archive size={13} /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && <ProductForm farms={farms} initial={editing} onSubmit={handleSubmit} onClose={() => { setShowForm(false); setEditing(null) }} />}
    </div>
  )
}
