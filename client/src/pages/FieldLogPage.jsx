import React, { useState, useEffect } from 'react'
import { ClipboardList, Leaf, AlertTriangle, RefreshCw, Calendar, ChevronRight, TrendingUp } from 'lucide-react'

const DISEASE_META = {
  healthy: { label: 'Healthy', color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: '🌿' },
  early_blight: { label: 'Early Blight', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🍂' },
  late_blight: { label: 'Late Blight', color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '🦠' },
}

const SEVERITY_BANDS = [
  { key: '0-25', label: '0–25 (Healthy)', color: '#4ade80' },
  { key: '26-50', label: '26–50 (Mild)', color: '#a3e635' },
  { key: '51-75', label: '51–75 (Moderate)', color: '#f59e0b' },
  { key: '76-100', label: '76–100 (Severe)', color: '#f87171' },
]

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function BarRow({ label, count, max, color, bg }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text2)', width: 140, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
    </div>
  )
}

export default function FieldLogPage({ user }) {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const token = localStorage.getItem('fm_token')
      const res = await fetch('/api/diagnosis/history', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setScans(Array.isArray(data) ? data : [])
    } catch { setScans([]) }
    setLoading(false)
    if (refresh) setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const byType = {
    healthy: scans.filter(s => s.disease_result === 'healthy').length,
    early_blight: scans.filter(s => s.disease_result === 'early_blight').length,
    late_blight: scans.filter(s => s.disease_result === 'late_blight').length,
  }
  const maxType = Math.max(...Object.values(byType), 1)

  const bySeverity = {
    '0-25': scans.filter(s => s.affected_area_pct <= 25).length,
    '26-50': scans.filter(s => s.affected_area_pct > 25 && s.affected_area_pct <= 50).length,
    '51-75': scans.filter(s => s.affected_area_pct > 50 && s.affected_area_pct <= 75).length,
    '76-100': scans.filter(s => s.affected_area_pct > 75).length,
  }
  const maxSev = Math.max(...Object.values(bySeverity), 1)

  const filtered = filter === 'all' ? scans : scans.filter(s => s.disease_result === filter)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>Field Log</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>{scans.length} scan{scans.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button onClick={() => load(true)} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 14px', width: 32, height: 32 }} />
          <p style={{ color: 'var(--text3)' }}>Loading field log...</p>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {Object.entries(byType).map(([key, count]) => {
              const meta = DISEASE_META[key]
              return (
                <div key={key} className="card" style={{ padding: '18px 20px', borderColor: `${meta.color}25`, background: meta.bg }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{meta.icon}</div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: meta.color, marginBottom: 3 }}>{count}</p>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>{meta.label}</p>
                </div>
              )
            })}
          </div>

          {/* Diagnoses by type */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingUp size={15} color="var(--accent)" /> Diagnoses by type
            </h2>
            {Object.entries(byType).map(([key, count]) => (
              <BarRow key={key} label={DISEASE_META[key].label} count={count} max={maxType} color={DISEASE_META[key].color} />
            ))}
          </div>

          {/* Severity distribution */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={15} color="var(--warning)" /> Severity distribution
            </h2>
            {SEVERITY_BANDS.map(b => (
              <BarRow key={b.key} label={b.label} count={bySeverity[b.key]} max={maxSev} color={b.color} />
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All', color: '#4ade80' },
              { key: 'healthy', label: 'Healthy', color: '#4ade80' },
              { key: 'early_blight', label: 'Early Blight', color: '#f59e0b' },
              { key: 'late_blight', label: 'Late Blight', color: '#f87171' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                padding: '7px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: filter === f.key ? 600 : 400,
                background: filter === f.key ? f.color : 'var(--bg3)',
                color: filter === f.key ? '#0a1a0f' : 'var(--text2)',
                transition: 'all 0.15s',
              }}>{f.label}</button>
            ))}
          </div>

          {/* Scan list */}
          {filtered.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔬</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>No scans yet</p>
              <p style={{ fontSize: 13, color: 'var(--text3)' }}>Go to AI Scan to diagnose your crops</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(scan => {
                const meta = DISEASE_META[scan.disease_result] || DISEASE_META.healthy
                return (
                  <div key={scan.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: meta.bg, border: `1.5px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 8px', borderRadius: 99 }}>
                          {Math.round(scan.confidence * 100)}% confidence
                        </span>
                        {scan.affected_area_pct > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {scan.affected_area_pct}% affected
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={10} color="var(--text3)" />
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDate(scan.created_at)}</span>
                        {scan.severity && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: meta.bg, color: meta.color, textTransform: 'capitalize' }}>{scan.severity}</span>}
                      </div>
                    </div>
                    <div style={{ width: 54, height: 54, borderRadius: 8, background: 'var(--bg3)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {scan.image_url
                        ? <img src={scan.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Leaf size={18} style={{ opacity: 0.25 }} />
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
