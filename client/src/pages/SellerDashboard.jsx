import React, { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Archive, Leaf, MapPin, Upload, X, Check, Clock, AlertTriangle } from 'lucide-react'

const CATEGORIES = ['seed', 'fertiliser', 'produce']
const RISK_TAGS = ['low', 'medium', 'high']

function statusBadge(status) {
  if (status === 'approved') return <span className="badge badge-green"><Check size={10} /> Approved</span>
  if (status === 'pending') return <span className="badge badge-yellow"><Clock size={10} /> Pending</span>
  if (status === 'archived') return <span className="badge badge-gray">Archived</span>
  return null
}

function ProductForm({ farms, initial, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category || 'seed',
    price: initial?.price || '',
    quantity: initial?.quantity || '',
    farm_id: initial?.farm_id || (farms[0]?.id || ''),
    disease_risk_tag: initial?.disease_risk_tag || 'low',
  })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(initial?.image_url || null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImage = e => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (image) fd.append('image', image)
      await onSubmit(fd)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{initial ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Product Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Organic Maize Seeds" required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Disease Risk Tag *</label>
                <select value={form.disease_risk_tag} onChange={e => set('disease_risk_tag', e.target.value)}>
                  {RISK_TAGS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)} Risk</option>)}
                </select>
              </div>
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
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                  padding: 20, textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.15s', background: 'var(--bg3)',
                  position: 'relative', overflow: 'hidden', minHeight: 100,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="preview" style={{ maxHeight: 140, borderRadius: 6, objectFit: 'cover' }} />
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>Click to change image</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} style={{ color: 'var(--text3)' }} />
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>Click to upload image</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
            </div>
            {!initial && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)' }}>
                <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>New listings require admin approval before appearing in the marketplace.</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : (initial ? 'Save Changes' : 'Submit for Approval')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SellerDashboard() {
  const [products, setProducts] = useState([])
  const [farms, setFarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/farms').then(r => r.json()),
    ]).then(([f]) => setFarms(f))
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const [approved, pending, archived] = await Promise.all([
        fetch('/api/products?status=approved').then(r => r.json()),
        fetch('/api/products?status=pending').then(r => r.json()),
        fetch('/api/products?status=archived').then(r => r.json()),
      ])
      setProducts([...approved, ...pending, ...archived])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (fd) => {
    if (editing) {
      await fetch(`/api/products/${editing.id}`, { method: 'PUT', body: fd })
    } else {
      await fetch('/api/products', { method: 'POST', body: fd })
    }
    setShowForm(false)
    setEditing(null)
    loadProducts()
  }

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this product? It will be hidden from the marketplace.')) return
    await fetch(`/api/products/${id}/archive`, { method: 'PATCH' })
    loadProducts()
  }

  const filtered = products.filter(p => {
    if (tab === 'approved') return p.status === 'approved'
    if (tab === 'pending') return p.status === 'pending'
    if (tab === 'archived') return p.status === 'archived'
    return true
  })

  const counts = {
    all: products.length,
    approved: products.filter(p => p.status === 'approved').length,
    pending: products.filter(p => p.status === 'pending').length,
    archived: products.filter(p => p.status === 'archived').length,
  }

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'approved', label: 'Live' },
    { id: 'pending', label: 'Pending' },
    { id: 'archived', label: 'Archived' },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Seller Dashboard</h1>
          <p style={{ color: 'var(--text2)' }}>Manage your product listings</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t.id ? 'var(--accent)' : 'var(--text2)',
              fontWeight: tab === t.id ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
            <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--bg3)', padding: '1px 7px', borderRadius: 99, color: 'var(--text3)' }}>
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto', width: 32, height: 32 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Leaf size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No products yet</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Add your first product to get started</p>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', flexWrap: 'wrap' }}>
              <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={22} style={{ opacity: 0.3 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`tag tag-${p.category}`}>{p.category}</span>
                  <span className={`tag tag-${p.disease_risk_tag}`}>{p.disease_risk_tag} risk</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} />{p.farm_name}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 80 }}>
                <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>${p.price.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>Qty: {p.quantity}</p>
              </div>
              <div style={{ minWidth: 90 }}>{statusBadge(p.status)}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '7px 10px' }}
                  onClick={() => { setEditing(p); setShowForm(true) }}
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                {p.status !== 'archived' && (
                  <button className="btn btn-danger" style={{ padding: '7px 10px' }} onClick={() => handleArchive(p.id)} title="Archive">
                    <Archive size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ProductForm
          farms={farms}
          initial={editing}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
