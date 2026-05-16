import React, { useState, useEffect } from 'react'
import { Check, X, ShieldCheck, Leaf, MapPin, BarChart3, Package, Clock, Archive } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{value}</p>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</p>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [pending, setPending] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})

  const loadData = async () => {
    setLoading(true)
    try {
      const [pendingRes, statsRes] = await Promise.all([
        fetch('/api/products?status=pending').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
      ])
      setPending(pendingRes)
      setStats(statsRes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const approve = async (id) => {
    setActing(a => ({ ...a, [id]: 'approving' }))
    await fetch(`/api/products/${id}/approve`, { method: 'PATCH' })
    setActing(a => ({ ...a, [id]: null }))
    loadData()
  }

  const reject = async (id) => {
    setActing(a => ({ ...a, [id]: 'rejecting' }))
    await fetch(`/api/products/${id}/reject`, { method: 'PATCH' })
    setActing(a => ({ ...a, [id]: null }))
    loadData()
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Admin Panel</h1>
        <p style={{ color: 'var(--text2)' }}>Review and approve product listings</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
          <StatCard label="Live Products" value={stats.total} icon={Package} color="var(--accent)" />
          <StatCard label="Pending Approval" value={stats.pending} icon={Clock} color="var(--warning)" />
          <StatCard label="Archived" value={stats.archived} icon={Archive} color="var(--text3)" />
          {stats.byCategory?.map(c => (
            <StatCard
              key={c.category}
              label={`${c.category.charAt(0).toUpperCase() + c.category.slice(1)}s`}
              value={c.count}
              icon={Leaf}
              color={c.category === 'seed' ? 'var(--accent)' : c.category === 'fertiliser' ? 'var(--warning)' : 'var(--blue)'}
            />
          ))}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="var(--warning)" />
          Pending Approval
          {pending.length > 0 && <span className="badge badge-yellow" style={{ marginLeft: 4 }}>{pending.length}</span>}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto', width: 32, height: 32 }} />
          </div>
        ) : pending.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <ShieldCheck size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>All caught up!</p>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No products waiting for review.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(p => (
              <div key={p.id} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={24} style={{ opacity: 0.3 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`tag tag-${p.category}`}>{p.category}</span>
                    <span className={`tag tag-${p.disease_risk_tag}`}>{p.disease_risk_tag} risk</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> {p.farm_name} — {p.region}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>${p.price.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>Qty: {p.quantity}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => approve(p.id)}
                    disabled={!!acting[p.id]}
                    style={{ padding: '8px 16px' }}
                  >
                    {acting[p.id] === 'approving' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={15} />}
                    Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => reject(p.id)}
                    disabled={!!acting[p.id]}
                    style={{ padding: '8px 16px' }}
                  >
                    {acting[p.id] === 'rejecting' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <X size={15} />}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
