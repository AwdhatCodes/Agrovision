import React, { useState, useEffect, useRef } from 'react'
import { Leaf, MapPin, X } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RISK_COLORS = { safe: '#4ade80', watch: '#fbbf24', outbreak: '#f87171' }
const RISK_BG = { safe: 'rgba(74,222,128,0.12)', watch: 'rgba(251,191,36,0.12)', outbreak: 'rgba(248,113,113,0.12)' }
const BLIGHT_LABELS = { early_blight: 'Early Blight', late_blight: 'Late Blight', none: 'None' }

const REGION_CENTERS = {
  'Northern Region': [11.8, 8.5],
  'Southern Region': [5.6, 7.2],
  'Eastern Region': [6.8, 11.4],
  'Western Region': [7.4, 3.9],
}

function farmIconSvg(riskLevel, certified) {
  const color = certified ? '#4ade80' : (RISK_COLORS[riskLevel] || '#60a5fa')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <ellipse cx="16" cy="38" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
    <path d="M16 0 C8 0 2 6 2 14 C2 24 16 38 16 38 C16 38 30 24 30 14 C30 6 24 0 16 0Z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="14" r="6" fill="white" opacity="0.9"/>
    <text x="16" y="18" text-anchor="middle" font-size="9" fill="${color}" font-weight="bold">🌿</text>
  </svg>`
}

function FarmPanel({ farm, onClose }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products?status=approved`)
      .then(r => r.json())
      .then(all => { setProducts(all.filter(p => p.farm_id === farm.id)); setLoading(false) })
  }, [farm.id])

  const riskColor = RISK_COLORS[farm.risk_level] || '#9aa3b8'

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, width: 310, height: '100%', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 20px rgba(0,0,0,0.4)' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{farm.name}</h3>
            {farm.certified_clean === 1 && <span style={{ fontSize: 10, background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>✓ Certified</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <MapPin size={10} color="var(--text3)" />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{farm.region}</span>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: RISK_BG[farm.risk_level] || 'var(--bg3)', color: riskColor, border: `1px solid ${riskColor}25`, textTransform: 'capitalize', fontWeight: 600 }}>
              {farm.risk_level || 'safe'}
            </span>
            {farm.region_blight && farm.region_blight !== 'none' && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                {BLIGHT_LABELS[farm.region_blight]}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><X size={16} /></button>
      </div>

      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 14, flexShrink: 0 }}>
        {[
          { label: 'Rating', value: farm.rating ? `★ ${farm.rating}` : '—' },
          { label: 'Reviews', value: farm.rating_count || 0 },
          { label: 'Detections', value: farm.detection_count || 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 14 }}>{value}</p>
            <p style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>
          Products <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({products.length})</span>
        </p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 28 }}><div className="spinner" style={{ margin: '0 auto', width: 22, height: 22 }} /></div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: 13 }}>No active listings</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map(p => (
              <div key={p.id} className="card" style={{ padding: '10px 13px', display: 'flex', gap: 10, alignItems: 'center', opacity: p.quarantined ? 0.55 : 1, borderColor: p.quarantined ? 'rgba(248,113,113,0.25)' : 'var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={14} style={{ opacity: 0.3 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{p.name}</p>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span className={`tag tag-${p.category}`} style={{ fontSize: 9, padding: '1px 5px' }}>{p.category}</span>
                    {p.quarantined === 1 && <span style={{ fontSize: 9, color: '#f87171' }}>⚠ Quarantined</span>}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>${p.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FarmMap() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const circlesRef = useRef([])
  const [farms, setFarms] = useState([])
  const [regions, setRegions] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)
  const [loading, setLoading] = useState(true)
  const selectedFarmRef = useRef(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/farms/map').then(r => r.json()),
      fetch('/api/regions/disease-risk').then(r => r.json()),
    ]).then(([f, r]) => {
      setFarms(f); setRegions(r); setLoading(false)
    })
  }, [])

  useEffect(() => {
    selectedFarmRef.current = selectedFarm
  }, [selectedFarm])

  useEffect(() => {
    if (loading || !mapRef.current) return
    if (mapInstanceRef.current) return // already initialized

    const map = L.map(mapRef.current, {
      center: [8.0, 7.5],
      zoom: 6,
      zoomControl: true,
    })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Disease zone circles
    regions.forEach(r => {
      const center = REGION_CENTERS[r.region]
      if (!center) return
      const circle = L.circle(center, {
        radius: 120000,
        color: RISK_COLORS[r.risk_level] || '#4ade80',
        fillColor: RISK_COLORS[r.risk_level] || '#4ade80',
        fillOpacity: r.risk_level === 'outbreak' ? 0.15 : r.risk_level === 'watch' ? 0.08 : 0.04,
        weight: r.risk_level === 'outbreak' ? 2 : 1,
        dashArray: r.risk_level === 'safe' ? '6 4' : null,
      }).addTo(map)
      circlesRef.current.push(circle)
    })

    // Farm markers
    farms.forEach(farm => {
      if (!farm.lat || !farm.lng) return
      const icon = L.divIcon({
        html: farmIconSvg(farm.risk_level, farm.certified_clean === 1),
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -42],
      })
      const marker = L.marker([farm.lat, farm.lng], { icon }).addTo(map)
      marker.on('click', () => {
        setSelectedFarm(farm)
      })

      const blightBadge = farm.region_blight && farm.region_blight !== 'none'
        ? `<div style="margin-top:6px;font-size:10px;color:#f87171;background:rgba(248,113,113,0.1);padding:2px 7px;border-radius:4px;display:inline-block">${BLIGHT_LABELS[farm.region_blight]}</div>`
        : ''

      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;min-width:180px;color:#e8eaf0">
          <p style="font-weight:700;font-size:14px;margin:0 0 4px">${farm.name}</p>
          <p style="font-size:11px;color:#9aa3b8;margin:0 0 6px">${farm.region}</p>
          ${farm.certified_clean ? '<div style="font-size:10px;color:#4ade80;background:rgba(74,222,128,0.1);padding:2px 8px;border-radius:99px;display:inline-block;margin-bottom:6px">✓ Certified Clean</div>' : ''}
          <div style="font-size:11px;color:#9aa3b8">★ ${farm.rating || '—'} (${farm.rating_count || 0} reviews)</div>
          ${blightBadge}
          <div style="margin-top:8px;font-size:11px;color:#9aa3b8">${farm.product_count || 0} active listings</div>
          <button onclick="window.__mapSelectFarm('${farm.id}')" style="margin-top:10px;width:100%;background:#4ade80;color:#0a1a0f;border:none;borderRadius:6px;padding:7px;font-size:12px;font-weight:600;cursor:pointer;border-radius:6px">View Products →</button>
        </div>
      `, { className: 'dark-popup' })
      markersRef.current.push(marker)
    })

    // Global callback for popup button
    window.__mapSelectFarm = (id) => {
      const farm = farms.find(f => f.id === id)
      if (farm) { map.closePopup(); setSelectedFarm(farm) }
    }

    return () => {
      map.remove()
      mapInstanceRef.current = null
      delete window.__mapSelectFarm
    }
  }, [loading, farms, regions])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Header bar */}
      <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Farm Map</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>{farms.length} farms · Potato blight disease zones</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {regions.map(r => (
            <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: RISK_BG[r.risk_level] || 'var(--bg3)', border: `1px solid ${(RISK_COLORS[r.risk_level] || '#9aa3b8')}30` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[r.risk_level] || '#9aa3b8', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: RISK_COLORS[r.risk_level] || '#9aa3b8', fontWeight: 500 }}>{r.region}</span>
              {r.detection_count > 0 && <span style={{ fontSize: 10, color: 'var(--text3)' }}>({r.detection_count})</span>}
              {r.blight_type && r.blight_type !== 'none' && <span style={{ fontSize: 10, color: RISK_COLORS[r.risk_level] }}>· {BLIGHT_LABELS[r.blight_type]}</span>}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 14px', width: 34, height: 34 }} />
            <p style={{ color: 'var(--text3)' }}>Loading map data...</p>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {selectedFarm && <FarmPanel farm={selectedFarm} onClose={() => setSelectedFarm(null)} />}

          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 24, left: 16, background: 'rgba(14,20,36,0.92)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 15px', zIndex: 500, backdropFilter: 'blur(8px)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Map Legend</p>
            {[
              { color: '#4ade80', label: 'Safe — no disease' },
              { color: '#fbbf24', label: 'Watch — blight detected' },
              { color: '#f87171', label: 'Outbreak — quarantine active' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11 }}>🌿</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Green pin = Certified Clean</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dark-popup .leaflet-popup-content-wrapper {
          background: #141c2e;
          color: #e8eaf0;
          border: 1px solid #2a3448;
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .dark-popup .leaflet-popup-tip {
          background: #141c2e;
        }
        .leaflet-popup-close-button {
          color: #9aa3b8 !important;
          font-size: 18px !important;
          top: 8px !important;
          right: 8px !important;
        }
      `}</style>
    </div>
  )
}
