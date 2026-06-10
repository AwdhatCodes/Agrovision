import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Leaf, MapPin, X, Zap, BarChart3, Activity, AlertTriangle,
  Package, Microscope, Award, Phone, Mail, Layers, TrendingUp,
  ShieldCheck, List, Clock,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.12)', watch: 'rgba(251,191,36,0.12)', outbreak: 'rgba(248,113,113,0.12)' }
const BLIGHT_LABELS = { early_blight: 'Early Blight', late_blight: 'Late Blight', none: 'None' }
const SCAN_LABELS = { healthy: 'Healthy', early_blight: 'Early Blight', late_blight: 'Late Blight', unknown: 'Unknown' }

const REGION_CENTERS = {
  'Nyandarua County': [-0.65, 36.52],
  'Meru County': [0.05, 37.65],
  'Nakuru County': [-0.30, 36.07],
  'Uasin Gishu': [0.52, 35.27],
}

const formatKsh = (n) => `KSh ${Number(n || 0).toLocaleString()}`

function farmIconSvg(riskLevel, certified, detailed = false) {
  const color = certified ? '#4ade80' : (RISK_COLORS[riskLevel] || '#60a5fa')
  const ring = detailed && riskLevel === 'outbreak' ? `<circle cx="16" cy="14" r="11" fill="none" stroke="#f87171" stroke-width="2" opacity="0.9"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <ellipse cx="16" cy="38" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
    ${ring}
    <path d="M16 0 C8 0 2 6 2 14 C2 24 16 38 16 38 C16 38 30 24 30 14 C30 6 24 0 16 0Z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="14" r="6" fill="white" opacity="0.9"/>
    <text x="16" y="18" text-anchor="middle" font-size="9" fill="${color}" font-weight="bold">🌿</text>
  </svg>`
}

function Metric({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 64 }}>
      <p style={{ fontWeight: 700, fontSize: 14, color: color || 'var(--text)' }}>{value}</p>
      <p style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</p>
    </div>
  )
}

const SCAN_COLORS = { late_blight: '#f87171', early_blight: '#fbbf24', healthy: '#4ade80' }
const SCAN_REPORTS = [
  { id: 'scan-1', farmerId: 'farmer-1', latitude: -0.304, longitude: 36.070, farmName: 'Nakuru Leaf Labs', diseaseType: 'late_blight', confidenceScore: 0.93, date: '2026-06-02T10:12:00Z', imageUrl: 'https://via.placeholder.com/260x140.png?text=Grad-CAM+Heatmap' },
  { id: 'scan-2', farmerId: 'farmer-2', latitude: 0.047, longitude: 37.656, farmName: 'Meru Ridge Estate', diseaseType: 'early_blight', confidenceScore: 0.82, date: '2026-06-04T15:28:00Z', imageUrl: 'https://via.placeholder.com/260x140.png?text=Grad-CAM+Heatmap' },
  { id: 'scan-3', farmerId: 'farmer-3', latitude: -0.655, longitude: 36.520, farmName: 'Nyandarua Greenhouse', diseaseType: 'healthy', confidenceScore: 0.99, date: '2026-06-05T08:10:00Z', imageUrl: 'https://via.placeholder.com/260x140.png?text=Grad-CAM+Heatmap' },
  { id: 'scan-4', farmerId: 'farmer-1', latitude: 0.515, longitude: 35.275, farmName: 'Uasin Gishu Crop Monitor', diseaseType: 'early_blight', confidenceScore: 0.78, date: '2026-06-01T12:50:00Z', imageUrl: 'https://via.placeholder.com/260x140.png?text=Grad-CAM+Heatmap' },
]
const TREND_DATA = Array.from({ length: 30 }, (_, idx) => {
  const day = new Date()
  day.setDate(day.getDate() - (29 - idx))
  return {
    date: `${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`,
    early: 2 + ((idx * 3) % 5),
    late: 1 + ((idx * 2) % 4),
  }
})
const AREA_DATA = [
  { region: 'Nakuru County', count: 8 },
  { region: 'Uasin Gishu', count: 7 },
  { region: 'Meru County', count: 5 },
  { region: 'Nyandarua County', count: 6 },
  { region: 'Kiambu County', count: 4 },
]

function scanIconSvg(type) {
  const color = SCAN_COLORS[type] || '#60a5fa'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0 C8 0 3 5 3 11 C3 19 14 36 14 36 C14 36 25 19 25 11 C25 5 20 0 14 0Z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="11" r="5" fill="white" opacity="0.95"/>
    <text x="14" y="13" text-anchor="middle" font-size="10" fill="${color}" font-weight="700">${type === 'healthy' ? '✓' : type === 'late_blight' ? 'L' : 'E'}</text>
  </svg>`
}

function formatConfidence(value) {
  const confidence = typeof value === 'number' ? value : Number(value) || 0
  return Math.round(confidence > 1 ? confidence : confidence * 100)
}

function getScanImage(src) {
  return src?.last_scan_heatmap || src?.heatmap || src?.imageUrl || src?.image_url || src?.last_scan_image_url || null
}

function buildScanPopup(report) {
  const imageUrl = getScanImage(report)
  return `
    <div style="font-family:system-ui,sans-serif;min-width:220px;color:#e8eaf0">
      <p style="font-weight:700;font-size:14px;margin:0 0 6px">${report.farmName}</p>
      <p style="font-size:11px;color:#9aa3b8;margin:0 0 8px">${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</p>
      <div style="font-size:11px;color:#e8eaf0;margin-bottom:8px">
        <strong style="color:${SCAN_COLORS[report.diseaseType] || '#60a5fa'};text-transform:none">${SCAN_LABELS[report.diseaseType] || report.diseaseType}</strong><br/>
        Date: ${new Date(report.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br/>
        Confidence: ${formatConfidence(report.confidenceScore)}%
      </div>
      ${imageUrl ? `
      <div style="border:1px solid rgba(255,255,255,0.12);border-radius:10px;overflow:hidden;background:#0f172a;margin-bottom:8px;">
        <img src="${imageUrl}" alt="Grad-CAM" style="width:100%;display:block;height:auto;" />
      </div>` : `<div style="font-size:11px;color:#9aa3b8;margin-bottom:8px">No scan image available for this report.</div>`}
      <div style="font-size:10px;color:#9aa3b8;line-height:1.4">Grad-CAM AI leaf heatmap shown above for the selected scan. Use this to verify infection regions and assist inspection.</div>
    </div>`
}

function LineChart({ data, keys, colors, height = 220 }) {
  const padding = 30
  const maxValue = Math.max(...data.flatMap(row => keys.map(key => row[key]))) || 1
  const width = 600
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2
  const points = data.map((row, index) => {
    const x = padding + (innerWidth * index) / Math.max(data.length - 1, 1)
    return keys.map(key => ({ x, y: padding + innerHeight - ((row[key] / maxValue) * innerHeight), value: row[key], key }))
  })

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Blight detections</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 4 }}>30-day trend of early and late detections.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {keys.map(key => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: colors[key] }} />{key === 'early' ? 'Early' : 'Late'}
            </span>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: 10 }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: height }}>
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={padding} x2={width - padding} y1={padding + innerHeight * f} y2={padding + innerHeight * f} stroke="rgba(148,163,184,0.15)" />
          ))}
          <text x={padding} y={20} fontSize="10" fill="#94a3b8">Cases</text>
          <text x={width - padding - 8} y={20} fontSize="10" fill="#94a3b8">Early / Late</text>
          {keys.map(key => (
            <polyline key={key} fill="none" stroke={colors[key]} strokeWidth="3"
              points={points.map(row => `${row.find(p => p.key === key).x},${row.find(p => p.key === key).y}`).join(' ')} />
          ))}
          {points.flat().map((point, idx) => (
            <g key={`${point.key}-${idx}`}>
              <circle cx={point.x} cy={point.y} r="3" fill={colors[point.key]} />
              <title>{`${point.value} ${point.key === 'early' ? 'early' : 'late'} cases`}</title>
            </g>
          ))}
          {data.map((row, idx) => {
            const x = padding + (innerWidth * idx) / Math.max(data.length - 1, 1)
            if (idx % 5 !== 0) return null
            return <text key={row.date} x={x} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{row.date}</text>
          })}
          <text x={width / 2} y={height - 2} textAnchor="middle" fontSize="10" fill="#94a3b8">Date</text>
        </svg>
      </div>
    </div>
  )
}

function BarChart({ data, labelKey = 'region', valueKey = 'count', color = '#60a5fa', height = 220 }) {
  const maxValue = Math.max(...data.map(row => row[valueKey])) || 1
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Affected Areas</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 4 }}>Quarantined farms by region.</p>
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px 16px 12px', minHeight: height }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: height - 70, paddingBottom: 10 }}>
          {data.map(row => {
            const barHeight = (row[valueKey] / maxValue) * (height - 100)
            return (
              <div key={row[labelKey]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: '100%', height: barHeight, minHeight: 16, background: color, borderRadius: 12, boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.12)' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>{row[labelKey]}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{row[valueKey]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Farmer — high abstraction: shopping-oriented, minimal ops data */
function FarmerFarmPanel({ farm, onClose }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [localFarm, setLocalFarm] = useState(farm)
  const [locUpdating, setLocUpdating] = useState(false)
  const [locError, setLocError] = useState('')
  const riskColor = RISK_COLORS[farm.risk_level] || '#9aa3b8'

  useEffect(() => {
    fetch('/api/products?status=approved')
      .then(r => r.json())
      .then(all => { setProducts(all.filter(p => p.farm_id === farm.id && p.quarantined !== 1)); setLoading(false) })
  }, [farm.id])

  useEffect(() => { setLocalFarm(farm) }, [farm])

  const pickLocation = () => {
    setLocError('')
    if (!navigator.geolocation) return setLocError('Geolocation not supported')
    setLocUpdating(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(`/api/farms/${farm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: latitude, lng: longitude }) })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || `Failed (${res.status})`)
        }
        // update local view immediately
        setLocalFarm(prev => ({ ...prev, lat: latitude, lng: longitude }))
        // notify map to reload markers if needed
        window.dispatchEvent(new CustomEvent('farms:reload'))
      } catch (err) {
        console.error('Pick location failed', err)
        setLocError(err.message || 'Location update failed')
      } finally { setLocUpdating(false) }
    }, err => { 
        let errorMessage = 'Unable to get location.';
        if (err.message.toLowerCase().includes('secure origin') || err.message.includes('Only secure origins are allowed')) {
            errorMessage = 'GPS requires a secure (HTTPS) connection or localhost.';
        }
        setLocError(errorMessage); 
        setLocUpdating(false) 
    }, { enableHighAccuracy: true, timeout: 20000 })
  }

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, width: 300, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.4)' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{localFarm.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
            <MapPin size={10} color="var(--text3)" />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{localFarm.region}</span>
            {localFarm.rating && <span style={{ fontSize: 10, color: 'var(--text2)', marginLeft: 4 }}>★ {localFarm.rating}</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {farm.certified_clean === 1 && (
              <span style={{ fontSize: 10, background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(74,222,128,0.25)' }}>✓ Certified</span>
            )}
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: RISK_BG[farm.risk_level] || 'var(--bg3)', color: riskColor, textTransform: 'capitalize', fontWeight: 600 }}>
              {farm.risk_level === 'safe' ? 'Low risk' : farm.risk_level || 'safe'}
            </span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn" onClick={pickLocation} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
              {locUpdating ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <MapPin size={12} />} Pick Location
            </button>
            {locError && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{locError}</span>}
            {localFarm.lat && localFarm.lng && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Saved: {Number(localFarm.lat).toFixed(5)}, {Number(localFarm.lng).toFixed(5)}</span>}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><X size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>Available Products</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 28 }}><div className="spinner" style={{ margin: '0 auto', width: 22, height: 22 }} /></div>
        ) : products.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>No products from this farm</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <div key={p.id} className="card" style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--bg3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={14} style={{ opacity: 0.3 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{p.name}</p>
                  <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent)', marginBottom: 0 }}>{formatKsh(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Admin view — low abstraction: operational & epidemiological detail */
function AdminFarmPanel({ farm, onClose }) {
  const [tab, setTab] = useState('overview')
  const [products, setProducts] = useState([])
  const [scans, setScans] = useState([])
  const [certs, setCerts] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const riskColor = RISK_COLORS[farm.risk_level] || '#9aa3b8'
  const latestScan = scans[0]

  useEffect(() => {
    setLoading(true)
    Promise.all([
      Promise.all(['approved', 'pending', 'archived'].map(s =>
        fetch(`/api/products?status=${s}`).then(r => r.json())
      )).then(lists => lists.flat().filter(p => p.farm_id === farm.id)),
      fetch(`/api/diagnosis/history?farm_id=${farm.id}`).then(r => r.json()),
      fetch(`/api/certifications?farm_id=${farm.id}`).then(r => r.json()),
      fetch(`/api/seller/analytics?farm_id=${farm.id}`).then(r => r.json()),
    ]).then(([prods, scanList, certList, stats]) => {
      setProducts(prods)
      setScans(scanList)
      setCerts(certList)
      setAnalytics(stats)
      setLoading(false)
    })
  }, [farm.id])

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'scans', label: 'AI Scans' },
    { id: 'certs', label: 'Certs' },
  ]

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, width: 420, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-6px 0 32px rgba(0,0,0,0.55)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Farm analysis</p>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{farm.name}</h3>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{farm.region} · {farm.lat?.toFixed(4)}, {farm.lng?.toFixed(4)}</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: RISK_BG[farm.risk_level], color: riskColor, fontWeight: 600, textTransform: 'capitalize' }}>{farm.risk_level}</span>
              {farm.region_blight && farm.region_blight !== 'none' && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>{BLIGHT_LABELS[farm.region_blight]}</span>
              )}
              {farm.certified_clean === 1 && <span className="badge badge-green" style={{ fontSize: 9 }}>Certified</span>}
              {farm.disease_safe === 1 && <span style={{ fontSize: 9, color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', padding: '2px 7px', borderRadius: 4 }}>Disease-safe</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
        </div>
        {(farm.owner_email || farm.owner_phone) && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {farm.owner_email && <span style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={10} />{farm.owner_email}</span>}
            {farm.owner_phone && <span style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={10} />{farm.owner_phone}</span>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 2, padding: '0 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
            padding: '8px 12px', background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--text3)', fontWeight: tab === t.id ? 600 : 400, fontSize: 11, cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto', width: 26, height: 26 }} /></div>
        ) : tab === 'overview' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                <div className="card" style={{ padding: 12, textAlign: 'center', borderRadius: 10 }}>
                <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{analytics?.total_scans || farm.scan_count || 0}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 0 }}>AI scans</p>
              </div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={12} /> Disease Alerts & Compliance</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
                <div><span style={{ color: 'var(--text3)', fontSize: 10 }}>Detections</span><p style={{ fontWeight: 600, marginTop: 2 }}>{farm.detection_count ?? 0}</p></div>
                <div><span style={{ color: 'var(--text3)', fontSize: 10 }}>AI Scans</span><p style={{ fontWeight: 600, marginTop: 2 }}>{farm.scan_count ?? scans.length}</p></div>
                <div><span style={{ color: 'var(--text3)', fontSize: 10 }}>Quarantined</span><p style={{ fontWeight: 600, marginTop: 2, color: farm.quarantined_count > 0 ? 'var(--danger)' : 'inherit' }}>{farm.quarantined_count || 0}</p></div>
                <div><span style={{ color: 'var(--text3)', fontSize: 10 }}>Pending</span><p style={{ fontWeight: 600, marginTop: 2 }}>{farm.pending_count || 0}</p></div>
              </div>
            </div>
            {farm.last_scan_at && (
              <div className="card" style={{ padding: 12, borderColor: farm.last_scan_result?.includes('blight') ? 'rgba(248,113,113,0.3)' : 'var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Microscope size={12} /> Latest AI Scan</p>
                <p style={{ fontSize: 12, fontWeight: 600 }}>{SCAN_LABELS[farm.last_scan_result] || farm.last_scan_result}</p>
                <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                  {formatConfidence(farm.last_scan_confidence)}% · {farm.last_scan_severity || 'N/A'} · {farm.last_scan_at?.slice(0, 10)}
                </p>
              </div>
            )}
            {latestScan && (latestScan.heatmap || latestScan.image_url) && (
              <div className="card" style={{ padding: 12, borderColor: latestScan.disease_result?.includes('blight') ? 'rgba(248,113,113,0.3)' : 'var(--border)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={12} /> Latest scan heatmap</p>
                <div style={{ borderRadius: 14, overflow: 'hidden', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img src={latestScan.heatmap || latestScan.image_url} alt="Latest scan" style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 210 }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{latestScan.disease_result ? `${SCAN_LABELS[latestScan.disease_result] || latestScan.disease_result}, ${formatConfidence(latestScan.confidence)}% confidence` : 'Scan available'}</p>
              </div>
            )}
          </div>
        ) : tab === 'scans' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scans.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>No scans recorded</p> : scans.map(s => (
              <div key={s.id} className="card" style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{SCAN_LABELS[s.disease_result] || s.disease_result}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{s.created_at?.slice(0, 16)}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {formatConfidence(s.confidence)}% conf · {s.severity} · {s.affected_area_pct || 0}% affected
                </p>
                {s.notes && <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{s.notes}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {certs.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>No certification history</p> : certs.map(c => (
              <div key={c.id} className="card" style={{ padding: '10px 12px', borderColor: c.status === 'certified' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={c.status === 'certified' ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 9 }}>{c.status}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{c.created_at?.slice(0, 10)}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>{c.reason}</p>
                {c.blight_type && c.blight_type !== 'none' && <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 4 }}>{BLIGHT_LABELS[c.blight_type]}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminRegionTable({ regions, regionStats }) {
  if (!regions.length) return null
  return (
    <div className="card" style={{ padding: 12, marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <BarChart3 size={12} /> Regional breakdown (analysis)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.6fr 0.6fr', gap: 6, fontSize: 10, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>
        <span>Region</span><span>Risk</span><span>Dets</span><span>Farms</span><span>Q</span>
      </div>
      {regions.map(r => {
        const rs = regionStats[r.region] || {}
        return (
          <div key={r.region} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.7fr 0.7fr 0.6fr 0.6fr', gap: 6, fontSize: 11, padding: '5px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{r.region}</span>
            <span style={{ color: RISK_COLORS[r.risk_level], textTransform: 'capitalize' }}>{r.risk_level}</span>
            <span>{r.detection_count || 0}</span>
            <span>{rs.farms || 0}</span>
            <span style={{ color: rs.quarantined > 0 ? 'var(--danger)' : 'inherit' }}>{rs.quarantined || 0}</span>
          </div>
        )
      })}
    </div>
  )
}

function AdminFarmsList({ farms, selectedId, onSelect }) {
  const sorted = [...farms].sort((a, b) => {
    const riskOrder = { outbreak: 0, watch: 1, safe: 2 }
    return (riskOrder[a.risk_level] ?? 3) - (riskOrder[b.risk_level] ?? 3)
  })
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, width: 240, maxHeight: 'calc(100% - 100px)',
      background: 'rgba(14,20,36,0.94)', border: '1px solid var(--border)', borderRadius: 14,
      zIndex: 500, backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><List size={12} /> Farms ({farms.length})</p>
        <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Sorted by risk — click for full analysis</p>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {sorted.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f)}
            style={{
              width: '100%', textAlign: 'left', padding: '9px 12px', background: selectedId === f.id ? 'rgba(74,222,128,0.12)' : 'transparent',
              border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)' }}>
              <span style={{ color: RISK_COLORS[f.risk_level], textTransform: 'capitalize' }}>{f.risk_level}</span>
              {' · '}{f.product_count || 0} live
              {(f.quarantined_count || 0) > 0 && <span style={{ color: 'var(--danger)' }}> · {f.quarantined_count}Q</span>}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function buildFarmerPopup(farm) {
  const riskNote = farm.risk_level === 'outbreak'
    ? '<div style="margin-top:6px;font-size:10px;color:#f87171">⚠ Active outbreak in this area</div>'
    : farm.risk_level === 'watch'
      ? '<div style="margin-top:6px;font-size:10px;color:#fbbf24">Caution advised in this area</div>'
      : ''
  return `
    <div style="font-family:system-ui,sans-serif;min-width:170px;color:#e8eaf0">
      <p style="font-weight:700;font-size:14px;margin:0 0 4px">${farm.name}</p>
      <p style="font-size:11px;color:#9aa3b8;margin:0 0 6px">${farm.region}</p>
      ${farm.certified_clean ? '<div style="font-size:10px;color:#4ade80;margin-bottom:6px">✓ Certified Clean</div>' : ''}
      <div style="font-size:11px;color:#9aa3b8">★ ${farm.rating || '—'} · ${farm.product_count || 0} products</div>
      ${riskNote}
      <button onclick="window.__mapSelectFarm('${farm.id}')" style="margin-top:10px;width:100%;background:#4ade80;color:#0a1a0f;border:none;padding:7px;font-size:12px;font-weight:600;cursor:pointer;border-radius:6px">View products</button>
    </div>`
}

function buildAdminPopup(farm) {
  const scanImage = farm.last_scan_heatmap || farm.last_scan_image_url || null
  const scanLine = farm.last_scan_at
    ? `<div style="font-size:10px;color:#9aa3b8;margin-top:4px">Last scan: ${SCAN_LABELS[farm.last_scan_result] || farm.last_scan_result} (${formatConfidence(farm.last_scan_confidence)}%)</div>` : ''
  const scanImageBlock = scanImage ? `
      <div style="border:1px solid rgba(255,255,255,0.12);border-radius:10px;overflow:hidden;background:#0f172a;margin:10px 0;">
        <img src="${scanImage}" alt="Latest scan heatmap" style="width:100%;display:block;height:auto;" />
      </div>` : ''
  return `
    <div style="font-family:system-ui,sans-serif;min-width:220px;color:#e8eaf0">
      <p style="font-weight:700;font-size:14px;margin:0 0 2px">${farm.name}</p>
      <p style="font-size:10px;color:#6b7590;margin:0 0 8px">ID ${farm.id?.slice(0, 8)}… · ${farm.lat?.toFixed(3)}, ${farm.lng?.toFixed(3)}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:rgba(74,222,128,0.15);color:${RISK_COLORS[farm.risk_level] || '#9aa3b8'};text-transform:capitalize">${farm.risk_level}</span>
        ${farm.certified_clean ? '<span style="font-size:10px;color:#4ade80">Certified</span>' : ''}
      </div>
      <div style="font-size:11px;color:#9aa3b8;line-height:1.5">
        <div>Products ${farm.product_count || 0} · Archived ${farm.archived_count || 0}</div>
        <div>Views ${farm.total_views || 0} · Scans ${farm.scan_count || 0}</div>
        <div>Region dets: ${farm.detection_count ?? 0} · ${farm.disease_safe ? 'Disease-safe' : 'Not disease-safe'}</div>
      </div>
      ${scanImageBlock}
      ${scanLine}
      <button onclick="window.__mapSelectFarm('${farm.id}')" style="margin-top:10px;width:100%;background:#4ade80;color:#0a1a0f;border:none;padding:7px;font-size:12px;font-weight:600;cursor:pointer;border-radius:6px">Open analysis panel →</button>
    </div>`
}

export default function FarmMap({ user }) {
  const isAdmin = user?.role?.toString().toLowerCase() === 'admin'
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const circlesRef = useRef([])
  const [farms, setFarms] = useState([])
  const [regions, setRegions] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showZones, setShowZones] = useState(true)
  const [showFarms, setShowFarms] = useState(true)

  // State for setting the farmer location from the top header
  const [locUpdating, setLocUpdating] = useState(false)
  const [locMessage, setLocMessage] = useState({ type: '', text: '' })

  // State for manual fallback
  const [showManual, setShowManual] = useState(false)
  const [manualLat, setManualLat] = useState('-1.1018') 
  const [manualLng, setManualLng] = useState('37.0144') 

  const userCoords = user?.location?.lat && user?.location?.lng
    ? [user.location.lat, user.location.lng]
    : user?.buyer_lat && user?.buyer_lng
      ? [user.buyer_lat, user.buyer_lng]
      : null
  const visibleScanReports = useMemo(() => {
    return isAdmin ? SCAN_REPORTS : SCAN_REPORTS.filter(scan => scan.farmerId === user?.id)
  }, [isAdmin, user?.id])

  const mapHeight = isAdmin ? 520 : 420

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      setSelectedFarm(null)
      try {
        if (isAdmin) {
          const res = await fetch('/api/farms/map?view=admin')
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || `Map data failed (${res.status})`)
          if (cancelled) return
          if (Array.isArray(data)) {
            setFarms(data)
            const r = await fetch('/api/regions/disease-risk').then(x => x.json())
            if (!cancelled) { setRegions(Array.isArray(r) ? r : []); setSummary(null) }
          } else {
            setFarms(data.farms || [])
            setRegions(data.regions || [])
            setSummary(data.summary || null)
          }
        } else {
          const [f, r] = await Promise.all([
            fetch('/api/farms/map').then(x => x.json()),
            fetch('/api/regions/disease-risk').then(x => x.json()),
          ])
          if (cancelled) return
          setFarms(Array.isArray(f) ? f : [])
          setRegions(Array.isArray(r) ? r : [])
          setSummary(null)
        }
      } catch (err) {
        if (cancelled) return
        console.error('Farm map load error:', err)
        setLoadError(err.message || 'Could not load map data')
        try {
          const [f, r] = await Promise.all([
            fetch('/api/farms/map').then(x => x.json()),
            fetch('/api/regions/disease-risk').then(x => x.json()),
          ])
          if (!cancelled) {
            setFarms(Array.isArray(f) ? f : [])
            setRegions(Array.isArray(r) ? r : [])
          }
        } catch { /* keep empty */ }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    window.addEventListener('farms:reload', load)
    return () => { cancelled = true; window.removeEventListener('farms:reload', load) }
  }, [isAdmin])

  const regionStats = useMemo(() => {
    if (!isAdmin || !farms.length) return {}
    const byRegion = {}
    farms.forEach(f => {
      if (!byRegion[f.region]) byRegion[f.region] = { farms: 0, certified: 0, quarantined: 0, scans: 0 }
      byRegion[f.region].farms += 1
      if (f.certified_clean === 1) byRegion[f.region].certified += 1
      byRegion[f.region].quarantined += f.quarantined_count || 0
      byRegion[f.region].scans += f.scan_count || 0
    })
    return byRegion
  }, [isAdmin, farms])

  // Enhanced function to handle fetching coords with better error parsing
  const updateFarmerLocation = () => {
    setLocMessage({ type: '', text: '' })
    if (!navigator.geolocation) return setLocMessage({ type: 'error', text: 'Geolocation not supported by your browser.' })
    
    setLocUpdating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const targetFarmId = user?.farm_id || user?.id 
          const res = await fetch(`/api/farms/${targetFarmId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ lat: latitude, lng: longitude }) 
          })
          
          if (!res.ok) throw new Error(`Failed (${res.status})`)
          
          setLocMessage({ type: 'success', text: 'Location saved!' })
          window.dispatchEvent(new CustomEvent('farms:reload')) // Refreshes the map markers
          setTimeout(() => setLocMessage({ type: '', text: '' }), 5000)
        } catch (err) {
          setLocMessage({ type: 'error', text: err.message || 'Update failed' })
        } finally {
          setLocUpdating(false)
        }
      }, 
      (err) => { 
        let errorMessage = 'Unable to get location.';
        if (err.code === 1) errorMessage = 'Location access denied. Please enable GPS permissions.';
        if (err.code === 2) errorMessage = 'Location unavailable. Ensure your GPS is turned on.';
        if (err.code === 3) errorMessage = 'Location request timed out.';
        
        // This catches the exact browser error shown in your screenshot
        if (err.message.toLowerCase().includes('secure origin') || err.message.includes('Only secure origins are allowed')) {
            errorMessage = 'Browser blocked GPS: Requires HTTPS or localhost to run.';
        }
        
        setLocMessage({ type: 'error', text: errorMessage })
        setLocUpdating(false) 
      }, 
      { enableHighAccuracy: true, timeout: 20000 }
    )
  }

  // Function to save manually entered coordinates
  const saveManualLocation = async () => {
    setLocMessage({ type: '', text: '' })
    setLocUpdating(true)
    try {
      const targetFarmId = user?.farm_id || user?.id 
      const res = await fetch(`/api/farms/${targetFarmId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ lat: parseFloat(manualLat), lng: parseFloat(manualLng) }) 
      })
      
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      
      setLocMessage({ type: 'success', text: 'Manual location saved!' })
      window.dispatchEvent(new CustomEvent('farms:reload'))
      setTimeout(() => { setLocMessage({ type: '', text: '' }); setShowManual(false); }, 3000)
    } catch (err) {
      setLocMessage({ type: 'error', text: err.message || 'Update failed' })
    } finally {
      setLocUpdating(false)
    }
  }

  useEffect(() => {
    if (loading || !mapRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
      markersRef.current = []
      circlesRef.current = []
    }

    const defaultCenter = isAdmin ? [0.02, 37.9] : (userCoords || [ -1.2921, 36.8219 ])
    const defaultZoom = isAdmin ? 6 : 10
    const map = L.map(mapRef.current, { center: defaultCenter, zoom: defaultZoom, zoomControl: true })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    const fitPoints = []

    if (showZones) {
      regions.forEach(r => {
        const center = REGION_CENTERS[r.region]
        if (!center) return
        const radius = isAdmin
          ? 80000 + Math.min((r.detection_count || 0) * 15000, 70000)
          : 120000
        const circle = L.circle(center, {
          radius,
          color: RISK_COLORS[r.risk_level] || '#4ade80',
          fillColor: RISK_COLORS[r.risk_level] || '#4ade80',
          fillOpacity: r.risk_level === 'outbreak' ? (isAdmin ? 0.2 : 0.15) : r.risk_level === 'watch' ? 0.1 : 0.04,
          weight: isAdmin && r.risk_level === 'outbreak' ? 3 : 1,
          dashArray: r.risk_level === 'safe' ? '6 4' : undefined,
        }).addTo(map)
        fitPoints.push(center)
        if (isAdmin) {
          const rs = regionStats[r.region] || {}
          circle.bindTooltip(
            `<strong>${r.region}</strong><br/>Risk: ${r.risk_level} · ${r.detection_count || 0} detections<br/>${rs.farms || 0} farms · ${rs.certified || 0} certified · ${rs.quarantined || 0} quarantined${r.blight_type && r.blight_type !== 'none' ? `<br/>Blight: ${BLIGHT_LABELS[r.blight_type]}` : ''}`,
            { permanent: false, direction: 'top', className: 'dark-tooltip' }
          )
        }
        circlesRef.current.push(circle)
      })
    }

    if (showFarms && isAdmin) {
      farms.forEach(farm => {
        if (!farm.lat || !farm.lng) return
        const icon = L.divIcon({
          html: farmIconSvg(farm.risk_level, farm.certified_clean === 1, isAdmin),
          className: '',
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -42],
        })
        const marker = L.marker([farm.lat, farm.lng], { icon }).addTo(map)
        fitPoints.push([farm.lat, farm.lng])
        marker.on('click', () => setSelectedFarm(farm))
        marker.bindPopup(isAdmin ? buildAdminPopup(farm) : buildFarmerPopup(farm), { className: 'dark-popup', maxWidth: isAdmin ? 300 : 260 })
        if (isAdmin) {
          marker.bindTooltip(
            `<strong>${farm.name}</strong><br/>${farm.risk_level} · Q:${farm.quarantined_count || 0} · Views:${farm.total_views || 0}`,
            { direction: 'top', offset: [0, -36], className: 'dark-tooltip' }
          )
        }
        markersRef.current.push(marker)
      })
    }

    visibleScanReports.forEach(report => {
      const icon = L.divIcon({
        html: scanIconSvg(report.diseaseType),
        className: '',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
      })
      const marker = L.marker([report.latitude, report.longitude], { icon }).addTo(map)
      fitPoints.push([report.latitude, report.longitude])
      marker.bindPopup(buildScanPopup(report), { className: 'dark-popup', maxWidth: 300 })
      markersRef.current.push(marker)
    })

    if (isAdmin) {
      if (fitPoints.length > 1) {
        map.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 40], maxZoom: 7 })
      } else if (fitPoints.length === 1) {
        map.setView(fitPoints[0], 7)
      }
    } else {
      if (userCoords) {
        map.setView(userCoords, 10)
      } else if (fitPoints.length > 1) {
        map.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 40], maxZoom: 10 })
      }
    }

    const resizeTimer = setTimeout(() => map.invalidateSize(), 50)
    const resizeTimer2 = setTimeout(() => map.invalidateSize(), 300)

    window.__mapSelectFarm = (id) => {
      const farm = farms.find(f => f.id === id)
      if (farm) { map.closePopup(); setSelectedFarm(farm) }
    }

    return () => {
      clearTimeout(resizeTimer)
      clearTimeout(resizeTimer2)
      map.remove()
      mapInstanceRef.current = null
      markersRef.current = []
      circlesRef.current = []
      delete window.__mapSelectFarm
    }
  }, [loading, farms, regions, isAdmin, showZones, showFarms, regionStats])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {isAdmin ? <BarChart3 size={20} color="var(--accent)" /> : <MapPin size={20} color="var(--accent)" />}
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{isAdmin ? 'Blight Geolocation Dashboard' : 'Farm Map'}</h1>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: 13, maxWidth: 760, margin: 0 }}>
            {isAdmin
              ? 'View AI scan reports, regional risk zones, and quarantine analytics in a dashboard layout.'
              : `${farms.length} farms · Simple view — find certified farms and inspect farm maps.`}
          </p>
        </div>
      </div>

      <div style={{ borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg2)', boxShadow: '0 20px 50px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {isAdmin ? <BarChart3 size={18} color="var(--accent)" /> : <MapPin size={16} color="var(--accent)" />}
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{isAdmin ? 'AI Scan Map & Risk Tracking' : 'Farm Locator'}</h2>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
              {isAdmin
                ? 'Interactive map markers show AI leaf scan pins and farm risk summaries along with detailed operational popups.'
                : 'Locate farms and view their certification, risk status, and available products on the map.'}
            </p>
          </div>
          
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className={`btn ${showZones ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => setShowZones(z => !z)}>
                <Layers size={12} /> Zones
              </button>
              <button type="button" className={`btn ${showFarms ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11, padding: '6px 10px' }} onClick={() => setShowFarms(f => !f)}>
                <MapPin size={12} /> Farms
              </button>
            </div>
          )}

          {!isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={updateFarmerLocation} 
                  disabled={locUpdating}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}
                >
                  {locUpdating && !showManual ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <MapPin size={14} />} 
                  Auto-Detect Location
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowManual(!showManual)}
                  style={{ padding: '8px 14px', fontSize: 12 }}
                >
                  {showManual ? 'Cancel Manual' : 'Enter Manually'}
                </button>
              </div>

              {/* Manual Entry Form */}
              {showManual && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg3)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <input 
                    type="number" 
                    step="any"
                    value={manualLat} 
                    onChange={e => setManualLat(e.target.value)} 
                    placeholder="Latitude" 
                    style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 6, width: 100, fontSize: 12 }}
                  />
                  <input 
                    type="number" 
                    step="any"
                    value={manualLng} 
                    onChange={e => setManualLng(e.target.value)} 
                    placeholder="Longitude" 
                    style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 6, width: 100, fontSize: 12 }}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={saveManualLocation}
                    disabled={locUpdating}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    Save
                  </button>
                </div>
              )}

              {locMessage.text && (
                <span style={{ fontSize: 12, color: locMessage.type === 'error' ? 'var(--danger)' : '#4ade80' }}>
                  {locMessage.text}
                </span>
              )}
            </div>
          )}

        </div>

        {isAdmin && summary && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {[
              { label: 'Farms', value: summary.total_farms, icon: MapPin },
              { label: 'Certified', value: summary.certified_farms, icon: Award },
              { label: 'Disease-safe', value: summary.disease_safe_farms, icon: ShieldCheck },
              { label: 'Detections', value: summary.total_detections, icon: Activity },
              { label: 'Outbreaks', value: summary.outbreak_regions, icon: AlertTriangle, color: 'var(--danger)' },
              { label: 'AI scans', value: summary.total_scans, icon: Microscope },
            ].map(({ label, value, icon: Icon, color, small }) => (
              <div key={label} className="card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} color={color || 'var(--accent)'} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: small ? 12 : 16, color: color || 'var(--text)' }}>{value}</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAdmin && (
          <div style={{ padding: '18px 24px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {regions.map(r => (
              <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 12, background: RISK_BG[r.risk_level] || 'var(--bg3)', border: `1px solid ${(RISK_COLORS[r.risk_level] || '#9aa3b8')}30` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[r.risk_level] || '#9aa3b8' }} />
                <span style={{ fontSize: 11, color: RISK_COLORS[r.risk_level] || '#9aa3b8', fontWeight: 500 }}>{r.region}</span>
                {r.risk_level !== 'safe' && <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' }}>{r.risk_level}</span>}
              </div>
            ))}
          </div>
        )}

        {loadError && !loading && (
          <div style={{ padding: '12px 24px', background: 'rgba(248,113,113,0.1)', color: 'var(--danger)', fontSize: 12 }}>
            {loadError} — showing basic map data.
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 14px', width: 34, height: 34 }} />
              <p style={{ color: 'var(--text3)' }}>Loading {isAdmin ? 'analysis' : 'map'} data...</p>
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', minHeight: mapHeight, background: 'var(--bg3)' }}>
            <div ref={mapRef} style={{ width: '100%', height: mapHeight, minHeight: mapHeight, background: 'var(--bg3)' }} />
            {isAdmin && farms.length > 0 && (
              <AdminFarmsList farms={farms} selectedId={selectedFarm?.id} onSelect={(f) => setSelectedFarm(f)} />
            )}
            {selectedFarm && isAdmin && <AdminFarmPanel farm={selectedFarm} onClose={() => setSelectedFarm(null)} />}
            {selectedFarm && !isAdmin && <FarmerFarmPanel farm={selectedFarm} onClose={() => setSelectedFarm(null)} />}
            <div style={{ position: 'absolute', bottom: 24, right: isAdmin ? 16 : 'auto', left: isAdmin ? 'auto' : 16, background: 'rgba(14,20,36,0.92)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', zIndex: 500, backdropFilter: 'blur(10px)', maxWidth: isAdmin ? 320 : 280, minWidth: 220 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>{isAdmin ? 'Analysis legend' : 'Map legend'}</p>
              {[
                { color: '#4ade80', label: 'Safe' },
                { color: '#fbbf24', label: 'Watch' },
                { color: '#f87171', label: 'Outbreak' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</span>
                </div>
              ))}
              {isAdmin ? (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
                  <p style={{ marginBottom: 4 }}>Tap a marker for farm analysis or heatmap detail.</p>
                </div>
              ) : (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
                  <p style={{ marginBottom: 4 }}>Tap a scan marker for details.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
        <div className="card" style={{ padding: 18 }}>
          <LineChart data={TREND_DATA} keys={[ 'early', 'late' ]} colors={{ early: '#fbbf24', late: '#f87171' }} />
        </div>
        <div className="card" style={{ padding: 18 }}>
          <BarChart data={AREA_DATA} valueKey="count" labelKey="region" color="#38bdf8" />
        </div>
      </div>

      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #141c2e;
          color: #e8eaf0;
          border: 1px solid #2a3448;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .dark-popup .leaflet-popup-tip { background: #141c2e; }
        .leaflet-popup-close-button { color: #9aa3b8 !important; font-size: 18px !important; }
        .dark-tooltip {
          background: #141c2e !important;
          border: 1px solid #2a3448 !important;
          color: #e8eaf0 !important;
          font-size: 11px !important;
          padding: 6px 10px !important;
          border-radius: 8px !important;
        }
      `}</style>
    </div>
  )
}