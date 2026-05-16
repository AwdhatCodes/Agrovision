import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ShieldCheck, AlertTriangle, Leaf, MapPin, Star, Package, X, ChevronRight } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const RISK_COLORS = {
  safe: '#4ade80',
  watch: '#fbbf24',
  outbreak: '#f87171',
}

const RISK_BG = {
  safe: 'rgba(74,222,128,0.12)',
  watch: 'rgba(251,191,36,0.12)',
  outbreak: 'rgba(248,113,113,0.12)',
}

function makeFarmIcon(riskLevel, diseaseSafe) {
  const color = diseaseSafe ? '#4ade80' : (RISK_COLORS[riskLevel] || '#60a5fa')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <ellipse cx="16" cy="38" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
    <path d="M16 0 C8 0 2 6 2 14 C2 24 16 38 16 38 C16 38 30 24 30 14 C30 6 24 0 16 0Z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="14" r="6" fill="white" opacity="0.9"/>
    <text x="16" y="18" text-anchor="middle" font-size="9" fill="${color}" font-weight="bold">🌿</text>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

function FarmPopup({ farm, onViewProducts }) {
  const riskColor = RISK_COLORS[farm.risk_level] || '#9aa3b8'
  return (
    <div style={{ minWidth: 220, fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: '#e8eaf0' }}>{farm.name}</strong>
        {farm.disease_safe === 1 && (
          <span style={{ fontSize: 10, background: 'rgba(74,222,128,0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: 99, border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <span>✓</span> Safe
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#9aa3b8', marginBottom: 8 }}>
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📍</span> {farm.region}
        </div>
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⭐</span> {farm.rating?.toFixed(1)} rating
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📦</span> {farm.product_count || 0} active products
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: RISK_BG[farm.risk_level] || 'rgba(155,163,184,0.1)', marginBottom: 10, border: `1px solid ${riskColor}30` }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: riskColor, fontWeight: 600, textTransform: 'capitalize' }}>
          {farm.risk_level || 'safe'} zone
        </span>
        {farm.detection_count > 0 && <span style={{ fontSize: 11, color: '#9aa3b8', marginLeft: 'auto' }}>{farm.detection_count} detections</span>}
      </div>
      <button
        onClick={() => onViewProducts(farm)}
        style={{ width: '100%', padding: '7px 12px', background: '#4ade80', color: '#0a1a0f', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        View Products →
      </button>
    </div>
  )
}

function MapLegend() {
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 16, zIndex: 1000, background: 'rgba(24,28,39,0.95)', border: '1px solid #2a3048', borderRadius: 10, padding: '14px 16px', backdropFilter: 'blur(8px)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#9aa3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Disease Risk Zones</p>
      {[['safe', 'Safe'], ['watch', 'Watch'], ['outbreak', 'Outbreak']].map(([level, label]) => (
        <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: RISK_COLORS[level], opacity: 0.7 }} />
          <span style={{ fontSize: 12, color: '#e8eaf0' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function FarmProductsPanel({ farm, onClose }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products?status=approved`)
      .then(r => r.json())
      .then(all => {
        setProducts(all.filter(p => p.farm_id === farm.id && !p.quarantined))
        setLoading(false)
      })
  }, [farm.id])

  const riskColor = RISK_COLORS[farm.risk_level] || '#9aa3b8'

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 320, height: '100%', zIndex: 999,
      background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{farm.name}</h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} />{farm.region}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 99, background: RISK_BG[farm.risk_level], color: riskColor, border: `1px solid ${riskColor}30` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor, display: 'inline-block' }} />
              {farm.risk_level || 'safe'} zone
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <Leaf size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>No active products from this farm</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {products.map(p => (
              <div key={p.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Leaf size={18} style={{ opacity: 0.3 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`tag tag-${p.category}`} style={{ fontSize: 10 }}>{p.category}</span>
                      <span className={`tag tag-${p.disease_risk_tag}`} style={{ fontSize: 10 }}>{p.disease_risk_tag} risk</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>${p.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecenterMap({ farms }) {
  const map = useMap()
  useEffect(() => {
    if (farms.length > 0) {
      const bounds = L.latLngBounds(farms.map(f => [f.lat, f.lng]))
      map.fitBounds(bounds, { padding: [60, 60] })
    }
  }, [farms, map])
  return null
}

export default function FarmMap() {
  const [farms, setFarms] = useState([])
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFarm, setSelectedFarm] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/farms/map').then(r => r.json()),
      fetch('/api/regions/disease-risk').then(r => r.json()),
    ]).then(([f, r]) => {
      setFarms(f)
      setRegions(r)
      setLoading(false)
    })
  }, [])

  const REGION_CENTERS = {
    'Northern Region': [11.8, 8.5],
    'Southern Region': [5.6, 7.2],
    'Eastern Region': [6.8, 11.4],
    'Western Region': [7.4, 3.9],
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 36, height: 36 }} />
          <p style={{ color: 'var(--text3)' }}>Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Farm Map</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>{farms.length} farms · click a pin to explore</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {regions.map(r => (
            <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: RISK_BG[r.risk_level], border: `1px solid ${RISK_COLORS[r.risk_level]}30` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[r.risk_level], display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: RISK_COLORS[r.risk_level], fontWeight: 500 }}>{r.region}</span>
              {r.detection_count > 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>({r.detection_count})</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[8.0, 7.5]}
          zoom={6}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {regions.map(r => {
            const center = REGION_CENTERS[r.region]
            if (!center) return null
            return (
              <Circle
                key={r.region}
                center={center}
                radius={120000}
                pathOptions={{
                  color: RISK_COLORS[r.risk_level],
                  fillColor: RISK_COLORS[r.risk_level],
                  fillOpacity: r.risk_level === 'outbreak' ? 0.18 : r.risk_level === 'watch' ? 0.1 : 0.05,
                  weight: r.risk_level === 'outbreak' ? 2 : 1,
                  dashArray: r.risk_level === 'safe' ? '6 4' : undefined,
                }}
              />
            )
          })}

          {farms.map(farm => (
            <Marker
              key={farm.id}
              position={[farm.lat, farm.lng]}
              icon={makeFarmIcon(farm.risk_level, farm.disease_safe)}
              eventHandlers={{ click: () => setSelectedFarm(farm) }}
            >
              <Popup maxWidth={260}>
                <FarmPopup farm={farm} onViewProducts={setSelectedFarm} />
              </Popup>
            </Marker>
          ))}

          {farms.length > 0 && <RecenterMap farms={farms} />}
        </MapContainer>

        <MapLegend />

        {selectedFarm && (
          <FarmProductsPanel farm={selectedFarm} onClose={() => setSelectedFarm(null)} />
        )}
      </div>
    </div>
  )
}
