import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, X, ShieldCheck, Leaf, MapPin, Package, Clock, Archive, AlertTriangle, Zap, Bell, Award, Star, Trash2, Plus, Pencil } from 'lucide-react'
import DiseaseTrendAnalytics from '../components/DiseaseTrendAnalytics'

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

function DiseaseTab({ regions, farms, onUpdate }) {
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ risk_level: 'safe', detection_count: 0, blight_type: 'none' })
  const [saving, setSaving] = useState(false)

  const center = useMemo(() => {
    const coords = farms
      .filter(f => Number.isFinite(Number(f.lat)) && Number.isFinite(Number(f.lng)))
      .map(f => [Number(f.lat), Number(f.lng)])
    if (!coords.length) return [0.0236, 37.9062]
    const avgLat = coords.reduce((sum, [lat]) => sum + lat, 0) / coords.length
    const avgLng = coords.reduce((sum, [, lng]) => sum + lng, 0) / coords.length
    return [avgLat, avgLng]
  }, [farms])

  const farmsWithLocation = farms.filter(f => Number.isFinite(Number(f.lat)) && Number.isFinite(Number(f.lng)))

  const openEdit = r => { setSelected(r.region); setForm({ risk_level: r.risk_level, detection_count: r.detection_count, blight_type: r.blight_type || 'none' }) }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/regions/disease-risk/${encodeURIComponent(selected)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setSelected(null); onUpdate()
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Zap size={15} color="var(--warning)" /> Potato Blight Heat Map</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ height: 400, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
          {!farms || farms.length === 0 ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
              <p style={{ fontSize: 13 }}>No farms with location data</p>
            </div>
          ) : (
            <MapContainer key={`map-${center.join('-')}`} center={center} zoom={6} scrollWheelZoom={true} style={{ width: '100%', height: '100%' }} attributionControl={true}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              />
              {farmsWithLocation.map(farm => {
                const regionData = regions.find(r => r.region === farm.region) || {}
                const riskLevel = regionData.risk_level || 'safe'
                const detectionCount = regionData.detection_count || 0

                return (
                  <Circle
                    key={`circle-${farm.id}`}
                    center={[Number(farm.lat), Number(farm.lng)]}
                    radius={25000 + (detectionCount * 5000)}
                    pathOptions={{
                      color: RISK_COLORS[riskLevel] || '#4ade80',
                      fillColor: RISK_COLORS[riskLevel] || '#4ade80',
                      fillOpacity: 0.35,
                      weight: 1.5,
                      dashArray: '5, 5',
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200, fontSize: 12 }}>
                        <strong style={{ display: 'block', marginBottom: 6 }}>{farm.name || 'Farm'}</strong>
                        <div style={{ marginBottom: 3 }}><strong>Region:</strong> {farm.region || 'Unknown'}</div>
                        <div style={{ marginBottom: 3 }}><strong>Risk:</strong> <span style={{ color: RISK_COLORS[riskLevel] || '#4ade80', fontWeight: 600 }}>{riskLevel.toUpperCase()}</span></div>
                        <div><strong>Detections:</strong> {detectionCount}</div>
                      </div>
                    </Popup>
                  </Circle>
                )
              })}
            </MapContainer>
          )}
        </div>

        <div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Region risk overview</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '6px 0 0' }}>Update risk levels and keep the map synced.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
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
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={e => e.target === e.currentTarget && setSelected(null)}>
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
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Detection Count
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>Auto-aggregated</span>
                </label>
                <input 
                  type="number" 
                  min="0" 
                  value={form.detection_count} 
                  readOnly 
                  style={{ 
                    background: 'rgba(0,0,0,0.2)', 
                    color: 'var(--text3)', 
                    cursor: 'not-allowed', 
                    border: '1px dashed var(--border)' 
                  }} 
                  title="Calculated automatically from live AI scans in this region."
                />
              </div>
              {(form.risk_level !== 'safe') && (
                <div style={{ padding: '9px 13px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 7, fontSize: 12, color: 'var(--text2)' }}>
                  <strong style={{ color: 'var(--warning)' }}>Auto-actions:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 14 }}>
                    <li>Disease alert created (simulated)</li>
                    {form.risk_level === 'outbreak' && <li style={{ color: 'var(--danger)', marginTop: 3 }}>All listings in region quarantined</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Apply'}</button>
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
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Award size={15} color="var(--accent)" /> Farm Certification</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 18 }}>Farms that pass the AI potato blight scan are marked as certified clean at the farm level only. This status applies to the farm, not individual products. Certification is auto-revoked when blight is detected.</p>

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
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={e => e.target === e.currentTarget && setRevokeModal(null)}>
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
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>This will remove the farm's Certified Clean status.</p>
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

function CertifiedFarmsTab({ farms }) {
  const certified = farms.filter(f => f.certified_clean === 1)
  const notCertified = farms.filter(f => f.certified_clean !== 1)
  
  const getBlightBadge = (farm) => {
    if (!farm.risk_level || farm.risk_level === 'safe') return null
    const isOutbreak = farm.risk_level === 'outbreak'
    const color = isOutbreak ? '#f87171' : '#fbbf24'
    const bgColor = isOutbreak ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)'
    const label = isOutbreak ? 'Outbreak' : 'Watch'
    const blightLabel = farm.blight_type && farm.blight_type !== 'none' ? BLIGHT_LABELS[farm.blight_type] : 'Unknown'
    
    return (
      <span style={{ fontSize: 10, color, background: bgColor, padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>
        {label} · {blightLabel}
      </span>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Award size={15} color="var(--accent)" /> Certified Farms Status</h2>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Overview of farm certification status and active blight issues.</p>

      {certified.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} /> Certified Clean — {certified.length}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {certified.map(f => (
              <div key={f.id} className="card" style={{ padding: '14px 16px', borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{f.name}</p>
                    <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{f.region}</span>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.15)', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Certified</span>
                </div>
                <div style={{ padding: '8px 0', borderTop: '1px solid rgba(74,222,128,0.1)', marginBottom: 8, paddingTop: 8 }}>
                  <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>Current risk: <strong style={{ color: f.risk_level === 'safe' ? 'var(--accent)' : 'var(--warning)' }}>{f.risk_level || 'safe'}</strong></p>
                  {f.detection_count > 0 && <p style={{ fontSize: 10, color: 'var(--text3)' }}>{f.detection_count} detection{f.detection_count > 1 ? 's' : ''} on record</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notCertified.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Leaf size={14} /> Not Certified — {notCertified.length}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {notCertified.map(f => {
              const hasBlight = getBlightBadge(f)
              const blightColor = f.risk_level === 'outbreak' ? 'rgba(248,113,113,0.02)' : f.risk_level === 'watch' ? 'rgba(251,191,36,0.02)' : 'var(--bg3)'
              const borderColor = f.risk_level === 'outbreak' ? 'rgba(248,113,113,0.2)' : f.risk_level === 'watch' ? 'rgba(251,191,36,0.2)' : 'var(--border)'
              
              return (
                <div key={f.id} className="card" style={{ padding: '14px 16px', background: blightColor, borderColor }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{f.name}</p>
                      <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} />{f.region}</span>
                    </div>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(100,116,139,0.2)', color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>Not Certified</span>
                  </div>
                  <div style={{ padding: '8px 0', borderTop: `1px solid ${borderColor}`, marginBottom: 8, paddingTop: 8 }}>
                    {hasBlight ? (
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 6 }}>Status: {hasBlight}</p>
                      </div>
                    ) : (
                      <p style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>✓ Ready for certification</p>
                    )}
                    {f.detection_count > 0 && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{f.detection_count} detection{f.detection_count > 1 ? 's' : ''}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {farms.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Award size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text3)' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No farms available</p>
        </div>
      )}
    </div>
  )
}

const STORE_BLIGHT_TYPES = ['early_blight', 'late_blight']

function productStatusBadge(status) {
  if (status === 'approved') return <span className="badge badge-green" style={{ fontSize: 10 }}>Live</span>
  if (status === 'pending') return <span className="badge badge-yellow" style={{ fontSize: 10 }}>Pending</span>
  if (status === 'archived') return <span className="badge badge-gray" style={{ fontSize: 10 }}>Archived</span>
  return null
}

function ProductsTab({ onEdit, onAdd, onUpdate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState({})

  const load = async () => {
    setLoading(true)
    const statuses = ['approved', 'pending', 'archived']
    const lists = await Promise.all(statuses.map(s => fetch(`/api/products?status=${s}&category=fertiliser`).then(r => r.json())))
    const merged = lists.flat().filter(p => STORE_BLIGHT_TYPES.includes(p.disease_type))
    const byId = new Map()
    merged.forEach(p => byId.set(p.id, p))
    setProducts([...byId.values()].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return
    setActing(a => ({ ...a, [id]: true }))
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setActing(a => ({ ...a, [id]: false }))
    load()
    onUpdate?.() 
  }

  const approve = async (id) => {
    setActing(a => ({ ...a, [id]: true }))
    await fetch(`/api/products/${id}/approve`, { method: 'PATCH' })
    setActing(a => ({ ...a, [id]: false }))
    load()
    onUpdate?.() 
  }

  const archiveProduct = async (id) => {
    if (!window.confirm('Archive this product? It will be hidden from the store.')) return
    setActing(a => ({ ...a, [id]: true }))
    await fetch(`/api/products/${id}/archive`, { method: 'PATCH' })
    setActing(a => ({ ...a, [id]: false }))
    load()
    onUpdate?.() 
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}><Package size={15} color="var(--accent)" /> Store Products</h2>
        <button type="button" className="btn btn-primary" onClick={onAdd} style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }}>
          <Plus size={14} /> Add Product
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Fungicides for Early and Late Blight. Edit listings shown in the farmer Store.</p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <Package size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text3)' }} />
          <p style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No store products yet</p>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Add fungicides for Early or Late Blight to show them in the Store. Use the Add Product button above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 42, height: 42, borderRadius: 7, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={16} style={{ opacity: 0.3 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</p>
                  {productStatusBadge(p.status)}
                  {p.quarantined === 1 && <span className="badge badge-red" style={{ fontSize: 10 }}>Quarantined</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{BLIGHT_LABELS[p.disease_type]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={9} />{p.farm_name} · {p.region}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Qty {p.quantity}</span>
                </div>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>KSh {Number(p.price).toLocaleString()}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => onEdit(p)} disabled={acting[p.id]}>
                  <Pencil size={11} /> Edit
                </button>
                {p.status === 'pending' && (
                  <button type="button" className="btn btn-primary" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => approve(p.id)} disabled={acting[p.id]}>
                    <Check size={11} /> Approve
                  </button>
                )}
                <button type="button" className="btn btn-ghost" style={{ padding: '5px 11px', fontSize: 12, color: 'var(--danger)' }} onClick={() => archiveProduct(p.id)} disabled={acting[p.id]}>
                  <Archive size={11} /> Archive
                </button>
                <button type="button" className="btn btn-danger" style={{ padding: '5px 11px', fontSize: 12 }} onClick={() => deleteProduct(p.id)} disabled={acting[p.id]}>
                  <Trash2 size={11} /> Delete
                </button>
              </div>
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
  const list = Array.isArray(alerts) ? alerts : []
  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}><Bell size={15} color="var(--warning)" /> Blight Alerts</h2>
      {list.length === 0 ? <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text3)' }}>No alerts.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {list.map(a => (
            <div key={a.id} className="card" style={{ padding: '14px 18px', borderColor: a.severity==='outbreak' ? 'rgba(248,113,113,0.3)' : 'rgba(251,191,36,0.2)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: a.severity==='outbreak' ? 'var(--danger)' : 'var(--warning)', marginTop: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, marginBottom: 5, lineHeight: 1.6 }}>{a.message}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{a.region}</span>
                    <span className={a.severity==='outbreak' ? 'badge badge-red' : 'badge badge-yellow'} style={{ fontSize: 10 }}>{a.severity}</span>
                    {a.blight_type && a.blight_type !== 'none' && <span style={{ fontSize: 10, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 7px', borderRadius: 4 }}>{BLIGHT_LABELS[a.blight_type]}</span>}
                    
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

function ProductFormModal({ farms, values, editing, onChange, onClose, onSubmit, saving, error }) {
  const canSubmit = values.name && values.price && values.quantity

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{editing ? 'Edit Store Product' : 'Add Store Product'}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}><X size={15} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '12px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div>
              <div className="form-group">
                <label>Product Name</label>
                <input value={values.name} onChange={e => onChange('name', e.target.value)} placeholder="e.g. Ridomil Gold Fungicide" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price (KSH)</label>
                  <input type="number" min="0" step="0.01" value={values.price} onChange={e => onChange('price', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="1" value={values.quantity} onChange={e => onChange('quantity', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Product Photo</label>
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0] || null
                  onChange('image', file)
                  onChange('image_url', file ? URL.createObjectURL(file) : '')
                }} />
              </div>
              {(values.image_url || values.image) && (
                <div style={{ marginTop: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={values.image_url} alt="Preview" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !canSubmit} style={{ flex: 1 }}>
              {saving ? <span className="spinner" style={{ width: 13, height: 13 }} /> : editing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminPanel({ pendingAction, onActionHandled }) {
  const [stats, setStats] = useState(null)
  const [regions, setRegions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [farms, setFarms] = useState([])
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', price: '', quantity: '', farm_id: '', disease_type: 'early_blight', disease_risk_tag: 'low', image: null, image_url: '' })
  const [productError, setProductError] = useState(null)
  const [productSaving, setProductSaving] = useState(false)
  const [productsRefresh, setProductsRefresh] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [tab, setTab] = useState('products')

  const loadData = async () => {
    setStatsLoading(true)
    try {
      const [r, a, f, pApproved, pPending, pArchived] = await Promise.all([
        fetch('/api/regions/disease-risk').then(res=>res.json()),
        fetch('/api/alerts').then(res=>res.json()),
        fetch('/api/farms').then(res=>res.json()),
        fetch('/api/products?status=approved&category=fertiliser').then(res=>res.json()),
        fetch('/api/products?status=pending&category=fertiliser').then(res=>res.json()),
        fetch('/api/products?status=archived&category=fertiliser').then(res=>res.json()),
      ])

      const STORE_BLIGHT_TYPES = ['early_blight', 'late_blight']
      
      const liveCount = Array.isArray(pApproved) ? pApproved.filter(p => STORE_BLIGHT_TYPES.includes(p.disease_type)).length : 0
      const pendingCount = Array.isArray(pPending) ? pPending.filter(p => STORE_BLIGHT_TYPES.includes(p.disease_type)).length : 0
      const archivedCount = Array.isArray(pArchived) ? pArchived.filter(p => STORE_BLIGHT_TYPES.includes(p.disease_type)).length : 0
      const certifiedCount = Array.isArray(f) ? f.filter(farm => farm.certified_clean === 1).length : 0
      const outbreakCount = Array.isArray(r) ? r.filter(reg => reg.risk_level === 'outbreak').length : 0

      setStats({
        total: liveCount,
        pending: pendingCount,
        archived: archivedCount,
        certified: certifiedCount,
        outbreaks: outbreakCount
      })
      
      setRegions(r)
      setAlerts(a)
      setFarms(f)
    } catch (err) {
      console.error("Failed to load admin stats:", err)
    } finally { 
      setStatsLoading(false) 
    }
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!farms.length) return
    setProductForm(f => (f.farm_id ? f : { ...f, farm_id: farms[0].id }))
  }, [farms])

  const closeProductForm = () => {
    setProductError(null)
    setEditingProduct(null)
    setShowProductForm(false)
  }

  const openProductForm = () => {
    setProductError(null)
    setEditingProduct(null)
    setProductForm({
      name: '',
      price: '',
      quantity: '',
      farm_id: farms[0]?.id || '',
      disease_type: 'early_blight',
      disease_risk_tag: 'low',
      image: null,
      image_url: '',
    })
    setTab('products')
    setShowProductForm(true)
  }

  useEffect(() => {
    if (!pendingAction || !farms.length) return
    const action = typeof pendingAction === 'string' ? { type: pendingAction } : pendingAction
    setTab('products')
    if (action.type === 'add-product') {
      openProductForm()
      onActionHandled?.()
    } else if (action.type === 'edit-product' && action.product) {
      openProductEdit(action.product)
      onActionHandled?.()
    }
  }, [pendingAction, farms])

  const openProductEdit = (product) => {
    setProductError(null)
    setEditingProduct(product)
    setTab('products')
    setProductForm({
      name: product.name || '',
      price: String(product.price ?? ''),
      quantity: String(product.quantity ?? ''),
      farm_id: product.farm_id || farms[0]?.id || '',
      disease_type: product.disease_type || 'early_blight',
      disease_risk_tag: product.disease_risk_tag || 'low',
      image: null,
      image_url: product.image_url || '',
    })
    setShowProductForm(true)
  }

  const updateProductForm = (key, value) => setProductForm(f => ({ ...f, [key]: value }))
  const handleProductSubmit = async (e) => {
    e.preventDefault()
    const farmId = productForm.farm_id || farms[0]?.id
    if (!farmId) {
      setProductError('Select a farm before saving the product.')
      return
    }
    setProductSaving(true)
    setProductError(null)
    try {
      const fd = new FormData()
      fd.append('name', productForm.name.trim())
      fd.append('category', 'fertiliser')
      fd.append('price', productForm.price)
      fd.append('quantity', productForm.quantity)
      fd.append('farm_id', farmId)
      fd.append('disease_risk_tag', productForm.disease_risk_tag || 'none')
      fd.append('disease_type', productForm.disease_type)
      if (productForm.image) {
        fd.append('image', productForm.image)
      }

      let productId = editingProduct?.id
      if (editingProduct) {
        const res = await fetch(`/api/products/${editingProduct.id}`, { method: 'PUT', body: fd })
        let updated
        try {
          updated = await res.json()
        } catch (parseErr) {
          const text = await res.text()
          throw new Error(text || parseErr.message)
        }
        if (!res.ok) throw new Error(updated.error || `Update failed (${res.status})`)
        productId = updated.id || editingProduct.id
      } else {
        const res = await fetch('/api/products', { method: 'POST', body: fd })
        let created
        try {
          created = await res.json()
        } catch (parseErr) {
          const text = await res.text()
          throw new Error(text || parseErr.message)
        }
        if (!res.ok) throw new Error(created.error || `Create failed (${res.status})`)
        if (!created.id) throw new Error('Product was created but no ID was returned')
        productId = created.id
      }

      const approveRes = await fetch(`/api/products/${productId}/approve`, { method: 'PATCH' })
      const approved = await approveRes.json()
      if (!approveRes.ok) {
        throw new Error(approved.error || `Approve failed (${approveRes.status})`)
      }

      closeProductForm()
      setProductForm({ name: '', price: '', quantity: '', farm_id: farms[0]?.id || '', disease_type: 'early_blight' })
      setProductsRefresh(n => n + 1)
      loadData()
    } catch (err) {
      console.error('Product save error:', err)
      setProductError(err.message || 'Unable to save product')
    } finally {
      setProductSaving(false)
    }
  }

  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const TABS = [
    { id: 'products', label: 'Products' },
    { id: 'disease', label: 'Blight Map' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'certified', label: 'Farms', badge: farms.filter(f => f.certified_clean === 1).length },
    { id: 'alerts', label: 'Alerts', badge: safeAlerts.length },
  ]

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>Admin Panel</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Manage admin store products and potato blight alerts</p>
        </div>
      </div>

      {statsLoading && !stats ? (
        <div style={{ textAlign: 'center', padding: '8px 0 20px' }}><div className="spinner" style={{ margin: '0 auto', width: 22, height: 22 }} /></div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Live Products" value={stats.total} icon={Package} color="var(--accent)" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="var(--warning)" />
          <StatCard label="Certified Farms" value={stats.certified||0} icon={Award} color="var(--accent)" />
          <StatCard label="Outbreaks" value={stats.outbreaks||0} icon={AlertTriangle} color="var(--danger)" />
          <StatCard label="Archived" value={stats.archived} icon={Archive} color="var(--text3)" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: tab===t.id ? '2px solid var(--accent)' : '2px solid transparent', color: tab===t.id ? 'var(--accent)' : 'var(--text2)', fontWeight: tab===t.id ? 600 : 400, fontSize: 12, cursor: 'pointer', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            {t.label}{t.badge > 0 && <span style={{ fontSize: 10, background: 'var(--bg3)', padding: '1px 6px', borderRadius: 99, color: 'var(--text3)' }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === 'products' && <ProductsTab key={productsRefresh} onEdit={openProductEdit} onAdd={openProductForm} onUpdate={loadData} />}
      
      {tab === 'disease' && (statsLoading && !regions.length ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto', width: 28, height: 28 }} /></div>
      ) : <DiseaseTab regions={regions} farms={farms} onUpdate={loadData} />)}
      {tab === 'analytics' && <DiseaseTrendAnalytics />}
      {tab === 'certified' && <CertifiedFarmsTab farms={farms} />}
      {tab === 'alerts' && <AlertsTab alerts={alerts} />}
      {showProductForm && (
        <ProductFormModal
          farms={farms}
          values={productForm}
          editing={!!editingProduct}
          onChange={updateProductForm}
          onClose={closeProductForm}
          onSubmit={handleProductSubmit}
          saving={productSaving}
          error={productError}
        />
      )}
    </div>
  )
}