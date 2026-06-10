import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'

function DiseaseTrendChart({ data, height = 240 }) {
  const padding = 28
  const width = 620
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  if (!data || data.length === 0) {
    return (
      <div style={{ borderRadius: 18, background: 'var(--bg3)', border: '1px solid var(--border)', padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text3)', fontSize: 12 }}>No disease scan data available yet</p>
      </div>
    )
  }

  const maxValue = Math.max(...data.flatMap(row => [row.lateBlight, row.earlyBlight, row.healthy]), 1)
  const points = data.map((row, idx) => ({
    x: padding + (innerWidth * idx) / Math.max(data.length - 1, 1),
    lateBlight: { y: padding + innerHeight - ((row.lateBlight / maxValue) * innerHeight), value: row.lateBlight },
    earlyBlight: { y: padding + innerHeight - ((row.earlyBlight / maxValue) * innerHeight), value: row.earlyBlight },
    healthy: { y: padding + innerHeight - ((row.healthy / maxValue) * innerHeight), value: row.healthy },
    label: row.month,
  }))

  const colors = {
    lateBlight: '#f87171',
    earlyBlight: '#fbbf24',
    healthy: '#4ade80',
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} color="var(--accent)" />
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Disease Trend Analytics</p>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>Monthly distribution of disease detections over time</p>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
          {Object.entries(colors).map(([key, color]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              {key === 'lateBlight' ? 'Late Blight' : key === 'earlyBlight' ? 'Early Blight' : 'Healthy'}
            </span>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: 18, background: 'var(--bg3)', border: '1px solid var(--border)', padding: 14, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={padding} x2={width - padding} y1={padding + f * innerHeight} y2={padding + f * innerHeight} stroke="rgba(148,163,184,0.18)" />
          ))}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const value = Math.round(maxValue * f)
            return (
              <text key={`y-${f}`} x={padding - 8} y={padding + (1 - f) * innerHeight + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
                {value}
              </text>
            )
          })}

          {/* Lines for each disease */}
          {['lateBlight', 'earlyBlight', 'healthy'].map(disease => (
            <polyline
              key={disease}
              fill="none"
              stroke={colors[disease]}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points.map(point => `${point.x},${point[disease].y}`).join(' ')}
            />
          ))}

          {/* Data points and tooltips */}
          {points.map((point, idx) =>
            ['lateBlight', 'earlyBlight', 'healthy'].map(disease => (
              <g key={`${point.label}-${disease}`}>
                <circle cx={point.x} cy={point[disease].y} r="3.5" fill={colors[disease]} />
                {point[disease].value > 0 && (
                  <text
                    x={point.x}
                    y={point[disease].y - 8}
                    textAnchor="middle"
                    fontSize="9"
                    fill={colors[disease]}
                    fontWeight="500"
                  >
                    {point[disease].value}
                  </text>
                )}
              </g>
            ))
          )}

          {/* X-axis labels */}
          {points.map((point, idx) =>
            idx % Math.ceil(data.length / 6) === 0 && (
              <text key={point.label} x={point.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
                {point.label}
              </text>
            )
          )}
        </svg>
      </div>
    </div>
  )
}

export default function DiseaseTrendAnalytics() {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/analytics/disease-trends')
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received HTML instead of JSON. Ensure your Node server is running and routing correctly.");
        }

        if (!response.ok) throw new Error('Failed to fetch trends from the database.')
        
        const data = await response.json()
        setTrends(data)
      } catch (err) {
        console.error('Error fetching disease trends:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTrends()
  }, [])

  if (loading) {
    return (
      <div style={{ borderRadius: 18, background: 'var(--bg3)', border: '1px solid var(--border)', padding: 40, textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px', width: 26, height: 26 }} />
        <p style={{ color: 'var(--text3)', fontSize: 12 }}>Loading disease trends...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ borderRadius: 18, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: 40, textAlign: 'center' }}>
        <AlertCircle size={24} color="#ef4444" style={{ margin: '0 auto 8px' }} />
        <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>Analytics Sync Error</p>
        <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</p>
      </div>
    )
  }

  return <DiseaseTrendChart data={trends} />
}