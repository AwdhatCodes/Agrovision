import React, { useState, useEffect } from 'react'
import { Check, X, ShieldCheck, Leaf, MapPin, Package, Clock, Archive, AlertTriangle, Lock, Unlock, Zap, Bell } from 'lucide-react'

const REGIONS = ['Northern Region', 'Southern Region', 'Eastern Region', 'Western Region']
const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.12)', watch: 'rgba(251,191,36,0.12)', outbreak: 'rgba(248,113,113,0.12)' }

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 700 }}>{value}</p>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</p>
      </div>
    </div>
  )
}

function DiseaseHeatMap({ regions, onUpdate }) {
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ risk_level: 'safe', detection_count: 0 })
  const [saving, setSaving] = useState(false)

  const openEdit = (r) => {
    setSelected(r.region)
    setForm({ risk_level: r.risk_level, detection_count: r.detection_count })
  }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/regions/disease-risk/${encodeURIComponent(selected)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSelected(null)
    onUpdate()
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={16} color="var(--warning)" /> Regional Disease Heat Map
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 8 }}>
        {regions.map(r => (
          <div key={r.region} className="card" style={{ padding: '14px 16px', borderColor: `${RISK_COLORS[r.risk_level]}40` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.region}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 10px', borderRadius: 99, background: RISK_BG[r.risk_level], color: RISK_COLORS[r.risk_level], border: `1px solid ${RISK_COLORS[r.risk_level]}30`, fontWeight: 600, textTransform: 'capitalize' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[r.risk_level], display: 'inline-block' }} />
                {r.risk_level}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.detection_count} detections</span>
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(r)}>Update</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Update Risk — {selected}</h2>
              <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ padding: '4px 8px' }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Risk Level</label>
                <select value={form.risk_level} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value }))}>
                  <option value="safe">🟢 Safe</option>
                  <option value="watch">🟡 Watch</option>
                  <option value="outbreak">🔴 Outbreak</option>
                </select>
              </div>
              <div className="form-group">
                <label>Detection Count</label>
                <input type="number" min="0" value={form.detection_count} onChange={e => setForm(f => ({ ...f, detection_count: parseInt(e.target.value) || 0 }))} />
              </div>
              {(form.risk_level === 'watch' || form.risk_level === 'outbreak') && (
                <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text2)' }}>
                  <strong style={{ color: 'var(--warning)' }}>Auto-actions:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                    <li>Disease alert will be created</li>
                    <li>Simulated email + SMS sent to sellers</li>
                    {form.risk_level === 'outbreak' && <li style={{ color: 'var(--danger)' }}>All products in this region will be quarantined</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuarantinePanel({ onUpdate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})
  const [tab, setTab] = useState('quarantined')

  const load = async () => {
    setLoading(true)
    const [approved] = await Promise.all([
      fetch('/api/products?status=approved').then(r => r.json()),
    ])
    setProducts(approved)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const quarantine = async (id) => {
    setActing(a => ({ ...a, [id]: true }))
    await fetch(`/api/products/${id}/quarantine`, { method: 'PATCH' })
    setActing(a => ({ ...a, [id]: false }))
    load()
    onUpdate()
  }

  const unquarantine = async (id) => {
    setActing(a => ({ ...a, [id]: true }))
    await fetch(`/api/products/${id}/unquarantine`, { method: 'PATCH' })
    setActing(a => ({ ...a, [id]: false }))
    load()
    onUpdate()
  }

  const quarantined = products.filter(p => p.quarantined === 1)
  const active = products.filter(p => p.quarantined === 0)
  const shown = tab === 'quarantined' ? quarantined : active

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Lock size={16} color="var(--danger)" /> Quarantine Control
      </h2>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[['quarantined', `Quarantined (${quarantined.length})`], ['active', `Active (${active.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 14px', background: 'none', border: 'none', borderBottom: tab === id ? '2px solid var(--danger)' : '2px solid transparent', color: tab === id ? 'var(--danger)' : 'var(--text2)', fontWeight: tab === id ? 600 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : shown.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
          {tab === 'quarantined' ? 'No quarantined products' : 'No active products'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(p => (
            <div key={p.id} className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: p.quarantined ? 'rgba(248,113,113,0.3)' : 'var(--border)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={18} style={{ opacity: 0.3 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{p.name}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`tag tag-${p.category}`} style={{ fontSize: 10 }}>{p.category}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} />{p.farm_name} · {p.region}</span>
                </div>
              </div>
              <span style={{ fontWeight: 700, color: p.quarantined ? 'var(--text3)' : 'var(--accent)', fontSize: 14 }}>${p.price.toFixed(2)}</span>
              {p.quarantined === 1 ? (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => unquarantine(p.id)} disabled={acting[p.id]}>
                  <Unlock size={12} /> Release
                </button>
              ) : (
                <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => quarantine(p.id)} disabled={acting[p.id]}>
                  <Lock size={12} /> Quarantine
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [pending, setPending] = useState([])
  const [stats, setStats] = useState(null)
  const [regions, setRegions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})
  const [tab, setTab] = useState('approvals')

  const loadData = async () => {
    setLoading(true)
    try {
      const [pendingRes, statsRes, regionsRes, alertsRes] = await Promise.all([
        fetch('/api/products?status=pending').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/regions/disease-risk').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
      ])
      setPending(pendingRes)
      setStats(statsRes)
      setRegions(regionsRes)
      setAlerts(alertsRes)
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

  const TABS = [
    { id: 'approvals', label: 'Approvals', badge: pending.length },
    { id: 'disease', label: 'Disease Map' },
    { id: 'quarantine', label: 'Quarantine' },
    { id: 'alerts', label: 'Alerts', badge: alerts.length },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Admin Panel</h1>
        <p style={{ color: 'var(--text2)' }}>Manage listings, disease alerts, and quarantine zones</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <StatCard label="Live Products" value={stats.total} icon={Package} color="var(--accent)" />
          <StatCard label="Pending Approval" value={stats.pending} icon={Clock} color="var(--warning)" />
          <StatCard label="Quarantined" value={stats.quarantined || 0} icon={Lock} color="var(--danger)" />
          <StatCard label="Active Outbreaks" value={stats.outbreaks || 0} icon={AlertTriangle} color="var(--danger)" />
          <StatCard label="Archived" value={stats.archived} icon={Archive} color="var(--text3)" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: tab === t.id ? 'var(--accent)' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            {t.badge > 0 && <span style={{ fontSize: 10, background: 'var(--bg3)', padding: '1px 7px', borderRadius: 99, color: 'var(--text3)' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'approvals' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--warning)" /> Pending Approval
            {pending.length > 0 && <span className="badge badge-yellow">{pending.length}</span>}
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto', width: 32, height: 32 }} /></div>
          ) : pending.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <ShieldCheck size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>All caught up!</p>
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>No products waiting for review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map(p => (
                <div key={p.id} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={22} style={{ opacity: 0.3 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`tag tag-${p.category}`}>{p.category}</span>
                      <span className={`tag tag-${p.disease_risk_tag}`}>{p.disease_risk_tag} risk</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> {p.farm_name} — {p.region}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>${p.price.toFixed(2)}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>Qty: {p.quantity}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => approve(p.id)} disabled={!!acting[p.id]} style={{ padding: '8px 14px' }}>
                      {acting[p.id] === 'approving' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Check size={15} />} Approve
                    </button>
                    <button className="btn btn-danger" onClick={() => reject(p.id)} disabled={!!acting[p.id]} style={{ padding: '8px 14px' }}>
                      {acting[p.id] === 'rejecting' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <X size={15} />} Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'disease' && <DiseaseHeatMap regions={regions} onUpdate={loadData} />}
      {tab === 'quarantine' && <QuarantinePanel onUpdate={loadData} />}

      {tab === 'alerts' && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color="var(--warning)" /> Disease Alerts
          </h2>
          {alerts.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>No alerts recorded.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map(a => (
                <div key={a.id} className="card" style={{ padding: '16px 20px', borderColor: a.severity === 'outbreak' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.2)' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.severity === 'outbreak' ? 'var(--danger)' : 'var(--warning)', marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.6 }}>{a.message}</p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{a.region}</span>
                        <span className={`badge ${a.severity === 'outbreak' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 10 }}>{a.severity}</span>
                        {a.simulated_email === 1 && <span style={{ fontSize: 11, color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: 4 }}>📧 Email sent (simulated)</span>}
                        {a.simulated_sms === 1 && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 4 }}>📱 SMS sent (simulated)</span>}
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
