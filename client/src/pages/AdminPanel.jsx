import React, { useState, useEffect } from 'react'
import { Check, X, ShieldCheck, Leaf, MapPin, Package, Clock, Archive, AlertTriangle, Lock, Unlock, Zap, Bell, Award, Star, Trash2 } from 'lucide-react'

const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.12)', watch: 'rgba(251,191,36,0.12)', outbreak: 'rgba(248,113,113,0.12)' }
const BLIGHT_LABELS = { early_blight: 'Early Blight', late_blight: 'Late Blight', none: 'Clean' }

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={19} color={color} />
      </div>
      <div><p style={{ fontSize: 24, fontWeight: 700 }}>{value}</p><p style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</p></div>
    </div>
  )
}

function ApprovalsTab({ pending, acting, approve, reject }) {
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Clock size={15} color="var(--warning)" /> Pending Approval {pending.length > 0 && <span className="badge badge-yellow">{pending.length}</span>}
      </h2>
      {pending.length === 0 ? (
        <div className="card" style={{ padding: 44, textAlign: 'center' }}>
          <ShieldCheck size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
          <p style={{ fontWeight: 600, marginBottom: 3 }}>All caught up!</p>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>No products waiting for review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(p => (
            <div key={p.id} className="card" style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 50, height: 50, borderRadius: 9, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={20} style={{ opacity: 0.3 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.name}</p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`tag tag-${p.category}`} style={{ fontSize: 10 }}>{p.category}</span>
                  {p.disease_type && p.disease_type !== 'none' && <span style={{ fontSize: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '2px 6px', borderRadius: 4 }}>{BLIGHT_LABELS[p.disease_type]}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} /> {p.farm_name} — {p.region}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 90 }}>
                <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 17 }}>KSh {Number(p.price).toLocaleString()}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>Qty: {p.quantity}</p>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button className="btn btn-primary" onClick={() => approve(p.id)} disabled={!!acting[p.id]} style={{ padding: '7px 13px', fontSize: 13 }}>
                  {acting[p.id] === 'approving' ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Check size={14} />} Approve
                </button>
                <button className="btn btn-danger" onClick={() => reject(p.id)} disabled={!!acting[p.id]} style={{ padding: '7px 13px', fontSize: 13 }}>
                  {acting[p.id] === 'rejecting' ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <X size={14} />} Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DiseaseTab({ regions, onUpdate }) {
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ risk_level: 'safe', detection_count: 0, blight_type: 'none' })
  const [saving, setSaving] = useState(false)

  const openEdit = r => { setSelected(r.region); setForm({ risk_level: r.risk_level, detection_count: r.detection_count, blight_type: r.blight_type || 'none' }) }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/regions/disease-risk/${encodeURIComponent(selected)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setSelected(null); onUpdate()
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Zap size={15} color="var(--warning)" /> Potato Blight Heat Map</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginBottom: 8 }}>
        {regions.map(r => (
          <div key={r.region} className="card" style={{ padding: '13px 15px', borderColor: `${RISK_COLORS[r.risk_level]}35` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.region}</span>
              <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 99, background: RISK_BG[r.risk_level], color: RISK_COLORS[r.risk_level], border: `1px solid ${RISK_COLORS[r.risk_level]}25`, fontWeight: 600, textTransform: 'capitalize' }}>{r.risk_level}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              {r.detection_count} detections · {r.blight_type && r.blight_type !== 'none' ? BLIGHT_LABELS[r.blight_type] : 'No blight'}
            </div>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11, width: '100%' }} onClick={() => openEdit(r)}>Update Risk</button>
          </div>
        ))}
      </div>
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Update Risk — {selected}</h2>
              <button className="btn btn-ghost" onClick={() => setSelected(null)} style={{ padding: '4px 8px' }}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Risk Level</label>
                <select value={form.risk_level} onChange={e => setForm(f => ({...f, risk_level: e.target.value}))}>
                  <option value="safe">🟢 Safe</option><option value="watch">🟡 Watch</option><option value="outbreak">🔴 Outbreak</option>
                </select>
              </div>
              <div className="form-group"><label>Blight Type</label>
                <select value={form.blight_type} onChange={e => setForm(f => ({...f, blight_type: e.target.value}))}>
                  <option value="none">None</option><option value="early_blight">Early Blight</option><option value="late_blight">Late Blight</option>
                </select>
              </div>
              <div className="form-group"><label>Detection Count</label>
                <input type="number" min="0" value={form.detection_count} onChange={e => setForm(f => ({...f, detection_count: parseInt(e.target.value)||0}))} />
              </div>
              {(form.risk_level !== 'safe') && (
                <div style={{ padding: '9px 13px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 7, fontSize: 12, color: 'var(--text2)' }}>
                  <strong style={{ color: 'var(--warning)' }}>Auto-actions:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 14 }}>
                    <li>Disease alert created + email/SMS (simulated)</li>
                    {form.risk_level === 'outbreak' && <li style={{ color: 'var(--danger)', marginTop: 3 }}>All listings in region quarantined</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" style={{ width: 13, height: 13 }} /> : null} Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CertificationTab({ onUpdate }) {
  const [farms, setFarms] = useState([])
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})

  const load = async () => {
    setLoading(true)
    const [f, c] = await Promise.all([fetch('/api/farms').then(r => r.json()), fetch('/api/certifications').then(r => r.json())])
    setFarms(f); setCerts(c); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const certify = async (id) => {
    setActing(a => ({...a, [id]: true}))
    await fetch(`/api/farms/${id}/certify`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reason: 'AI scan passed — no Early or Late Blight detected' }) })
    setActing(a => ({...a, [id]: false})); load(); onUpdate()
  }
  const revoke = async (id, blightType) => {
    setActing(a => ({...a, [id]: true}))
    await fetch(`/api/farms/${id}/revoke`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ reason: `${BLIGHT_LABELS[blightType]} detected by AI diagnosis module`, blight_type: blightType }) })
    setActing(a => ({...a, [id]: false})); load(); onUpdate()
  }
  const [revokeModal, setRevokeModal] = useState(null)
  const [blightType, setBlightType] = useState('early_blight')

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto', width: 28, height: 28 }} /></div>

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Award size={15} color="var(--accent)" /> Disease-Free Certification</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>Farms that pass the AI potato blight scan receive a "Certified Clean" badge on all their listings. Certification is auto-revoked when blight is detected.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {farms.map(f => (
          <div key={f.id} className="card" style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: f.certified_clean ? 'rgba(74,222,128,0.3)' : 'var(--border)' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</p>
                {f.certified_clean === 1 && <span className="badge badge-green" style={{ fontSize: 10 }}><Award size={9} /> Certified Clean</span>}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} />{f.region}</span>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {f.certified_clean !== 1 ? (
                <button className="btn btn-primary" style={{ padding: '6px 13px', fontSize: 12 }} onClick={() => certify(f.id)} disabled={acting[f.id]}>
                  <Award size={12} /> Certify
                </button>
              ) : (
                <button className="btn btn-danger" style={{ padding: '6px 13px', fontSize: 12 }} onClick={() => setRevokeModal(f)} disabled={acting[f.id]}>
                  <X size={12} /> Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>Certification History</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {certs.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: 13 }}>No certification history.</p> : certs.map(c => (
          <div key={c.id} className="card" style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderColor: c.status === 'certified' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === 'certified' ? 'var(--accent)' : 'var(--danger)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ fontWeight: 500, fontSize: 13 }}>{c.farm_name}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{c.reason}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={c.status === 'certified' ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 10 }}>{c.status}</span>
              {c.blight_type && c.blight_type !== 'none' && <span style={{ fontSize: 10, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 7px', borderRadius: 4 }}>{BLIGHT_LABELS[c.blight_type]}</span>}
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{c.created_at?.slice(0, 10)}</span>
            </div>
          </div>
        ))}
      </div>

      {revokeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRevokeModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Revoke Certification — {revokeModal.name}</h2>
              <button className="btn btn-ghost" onClick={() => setRevokeModal(null)} style={{ padding: '4px 8px' }}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Blight type detected</label>
                <select value={blightType} onChange={e => setBlightType(e.target.value)}>
                  <option value="early_blight">Early Blight</option><option value="late_blight">Late Blight</option>
                </select>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>This will remove the Certified Clean badge and flag all listings from this farm.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRevokeModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { revoke(revokeModal.id, blightType); setRevokeModal(null) }}>Revoke Certification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuarantineTab({ onUpdate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})
  const [tab, setTab] = useState('quarantined')

  const load = async () => {
    setLoading(true)
    const all = await fetch('/api/products?status=approved').then(r => r.json())
    setProducts(all); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const quarantine = async id => { setActing(a => ({...a,[id]:true})); await fetch(`/api/products/${id}/quarantine`,{method:'PATCH'}); setActing(a => ({...a,[id]:false})); load(); onUpdate() }
  const unquarantine = async id => { setActing(a => ({...a,[id]:true})); await fetch(`/api/products/${id}/unquarantine`,{method:'PATCH'}); setActing(a => ({...a,[id]:false})); load(); onUpdate() }

  const shown = tab === 'quarantined' ? products.filter(p => p.quarantined===1) : products.filter(p => p.quarantined===0)

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Lock size={15} color="var(--danger)" /> Quarantine Control</h2>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
        {[['quarantined',`Quarantined (${products.filter(p=>p.quarantined===1).length})`],['active',`Active (${products.filter(p=>p.quarantined===0).length})`]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '7px 14px', background: 'none', border: 'none', borderBottom: tab===id ? '2px solid var(--danger)' : '2px solid transparent', color: tab===id ? 'var(--danger)' : 'var(--text2)', fontWeight: tab===id ? 600 : 400, fontSize: 12, cursor: 'pointer', marginBottom: -1 }}>{label}</button>
        ))}
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : shown.length === 0 ? (
        <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>{tab === 'quarantined' ? 'No quarantined products' : 'No active products'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(p => (
            <div key={p.id} className="card" style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderColor: p.quarantined ? 'rgba(248,113,113,0.3)' : 'var(--border)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 7, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image_url ? <img src={p.image_url} style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : <Leaf size={16} style={{ opacity: 0.3 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{p.name}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`tag tag-${p.category}`} style={{ fontSize: 10 }}>{p.category}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} />{p.farm_name} · {p.region}</span>
                </div>
              </div>
              <span style={{ fontWeight: 700, color: p.quarantined ? 'var(--text3)' : 'var(--accent)', fontSize: 13 }}>KSh {Number(p.price).toLocaleString()}</span>
              {p.quarantined===1 ? (
                <button className="btn btn-secondary" style={{ padding:'5px 11px',fontSize:12 }} onClick={() => unquarantine(p.id)} disabled={acting[p.id]}><Unlock size={11}/> Release</button>
              ) : (
                <button className="btn btn-danger" style={{ padding:'5px 11px',fontSize:12 }} onClick={() => quarantine(p.id)} disabled={acting[p.id]}><Lock size={11}/> Quarantine</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewsTab() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => { fetch('/api/reviews').then(r => r.json()).then(d => { setReviews(d); setLoading(false) }) }
  useEffect(() => { load() }, [])

  const remove = async id => { await fetch(`/api/reviews/${id}`, { method: 'DELETE' }); load() }
  const setApproval = async (id, approved) => { await fetch(`/api/reviews/${id}/${approved ? 'approve' : 'reject'}`, { method: 'PATCH' }); load() }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Star size={15} color="var(--warning)" /> Review Moderation</h2>
      {loading ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : reviews.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No reviews yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {reviews.map(r => (
            <div key={r.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', borderColor: r.approved ? 'var(--border)' : 'rgba(248,113,113,0.25)' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 1 }}>{[1,2,3,4,5].map(i => <Star key={i} size={11} fill={i<=r.rating?'#fbbf24':'none'} color={i<=r.rating?'#fbbf24':'#3a4060'} />)}</div>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{r.buyer_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>on <em style={{ color: 'var(--text2)' }}>{r.product_name}</em></span>
                  <span className={r.approved ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 9, marginLeft: 'auto' }}>{r.approved ? 'Visible' : 'Hidden'}</span>
                </div>
                {r.comment && <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{r.comment}</p>}
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button className={`btn ${r.approved ? 'btn-secondary' : 'btn-primary'}`} style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => setApproval(r.id, !r.approved)}>
                  {r.approved ? <X size={11} /> : <Check size={11} />} {r.approved ? 'Hide' : 'Show'}
                </button>
                <button className="btn btn-danger" style={{ padding: '5px 9px', fontSize: 11 }} onClick={() => remove(r.id)}><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertsTab({ alerts }) {
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Bell size={15} color="var(--warning)" /> Blight Alerts</h2>
      {alerts.length === 0 ? <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text3)' }}>No alerts.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {alerts.map(a => (
            <div key={a.id} className="card" style={{ padding: '14px 18px', borderColor: a.severity==='outbreak' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.2)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: a.severity==='outbreak' ? 'var(--danger)' : 'var(--warning)', marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, marginBottom: 5, lineHeight: 1.6 }}>{a.message}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{a.region}</span>
                    <span className={a.severity==='outbreak' ? 'badge badge-red' : 'badge badge-yellow'} style={{ fontSize: 10 }}>{a.severity}</span>
                    {a.blight_type && a.blight_type !== 'none' && <span style={{ fontSize: 10, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 7px', borderRadius: 4 }}>{BLIGHT_LABELS[a.blight_type]}</span>}
                    {a.simulated_email===1 && <span style={{ fontSize: 10, color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', padding: '2px 7px', borderRadius: 4 }}>📧 Email sent</span>}
                    {a.simulated_sms===1 && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(74,222,128,0.1)', padding: '2px 7px', borderRadius: 4 }}>📱 SMS sent</span>}
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{a.created_at?.slice(0,10)}</span>
                  </div>
                </div>
              </div>
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
      const [p, s, r, a] = await Promise.all([
        fetch('/api/products?status=pending').then(r=>r.json()),
        fetch('/api/stats').then(r=>r.json()),
        fetch('/api/regions/disease-risk').then(r=>r.json()),
        fetch('/api/alerts').then(r=>r.json()),
      ])
      setPending(p); setStats(s); setRegions(r); setAlerts(a)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const approve = async id => { setActing(a => ({...a,[id]:'approving'})); await fetch(`/api/products/${id}/approve`,{method:'PATCH'}); setActing(a=>({...a,[id]:null})); loadData() }
  const reject = async id => { setActing(a => ({...a,[id]:'rejecting'})); await fetch(`/api/products/${id}/reject`,{method:'PATCH'}); setActing(a=>({...a,[id]:null})); loadData() }

  const TABS = [
    { id: 'approvals', label: 'Approvals', badge: pending.length },
    { id: 'disease', label: 'Blight Map' },
    { id: 'certification', label: 'Certification' },
    { id: 'quarantine', label: 'Quarantine' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'alerts', label: 'Alerts', badge: alerts.length },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>Admin Panel</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Manage listings, potato blight alerts, and certification</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Live Products" value={stats.total} icon={Package} color="var(--accent)" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="var(--warning)" />
          <StatCard label="Certified Farms" value={stats.certified||0} icon={Award} color="var(--accent)" />
          <StatCard label="Quarantined" value={stats.quarantined||0} icon={Lock} color="var(--danger)" />
          <StatCard label="Outbreaks" value={stats.outbreaks||0} icon={AlertTriangle} color="var(--danger)" />
          <StatCard label="Archived" value={stats.archived} icon={Archive} color="var(--text3)" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab===t.id ? '2px solid var(--accent)' : '2px solid transparent', color: tab===t.id ? 'var(--accent)' : 'var(--text2)', fontWeight: tab===t.id ? 600 : 400, fontSize: 12, cursor: 'pointer', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            {t.label}{t.badge > 0 && <span style={{ fontSize: 10, background: 'var(--bg3)', padding: '1px 6px', borderRadius: 99, color: 'var(--text3)' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {loading && tab === 'approvals' ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto', width: 30, height: 30 }} /></div>
      ) : (
        <>
          {tab === 'approvals' && <ApprovalsTab pending={pending} acting={acting} approve={approve} reject={reject} />}
          {tab === 'disease' && <DiseaseTab regions={regions} onUpdate={loadData} />}
          {tab === 'certification' && <CertificationTab onUpdate={loadData} />}
          {tab === 'quarantine' && <QuarantineTab onUpdate={loadData} />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'alerts' && <AlertsTab alerts={alerts} />}
        </>
      )}
    </div>
  )
}
