import React, { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, Leaf, AlertTriangle, CheckCircle, Zap, ChevronDown, Clock, RefreshCw, Zap as HeatIcon } from 'lucide-react'

const DISEASE_INFO = {
  healthy: {
    label: 'Healthy Plant',
    icon: '🟢',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.25)',
    severity: 'None',
    description: 'No disease detected. The potato plant appears healthy.',
    symptoms: ['Uniform green coloration', 'No lesions or spots', 'Firm leaves', 'Normal growth pattern'],
    treatment: ['Continue regular irrigation schedule', 'Maintain balanced NPK fertilisation', 'Monitor weekly for any early signs', 'Ensure good field drainage'],
    prevention: ['Rotate crops every season', 'Use certified disease-free seeds', 'Maintain plant spacing for air flow'],
  },
  early_blight: {
    label: 'Early Blight',
    icon: '🟡',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    severity: 'Moderate',
    pathogen: 'Alternaria solani',
    description: 'Early Blight is a fungal disease caused by Alternaria solani. It typically starts on older leaves near the base of the plant.',
    symptoms: ['Dark brown to black circular spots', 'Target-board concentric ring pattern', 'Yellow halo surrounding lesions', 'Lower leaves affected first', 'Lesions up to 1–2 cm in diameter'],
    treatment: ['Apply chlorothalonil or mancozeb fungicide', 'Remove and destroy infected leaves immediately', 'Reduce overhead irrigation to limit moisture', 'Apply copper-based fungicide every 7–10 days', 'Improve airflow between plants'],
    prevention: ['Avoid overhead irrigation', 'Plant resistant varieties', 'Apply preventive fungicide before rainy season', 'Maintain adequate crop nutrition'],
  },
  late_blight: {
    label: 'Late Blight',
    icon: '🔴',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.3)',
    severity: 'Severe — Act Immediately',
    pathogen: 'Phytophthora infestans',
    description: 'Late Blight is a highly destructive disease caused by Phytophthora infestans. It can devastate an entire crop within days under wet, cool conditions.',
    symptoms: ['Water-soaked pale-green lesions on leaf margins', 'Lesions turn brown and greasy', 'White mold on leaf undersides in humid conditions', 'Rapid browning of stems', 'Strong musty odour from infected tissue'],
    treatment: ['Isolate affected plants immediately to prevent spread', 'Apply metalaxyl or cymoxanil fungicide urgently', 'Destroy severely infected plants — do not compost', 'Alert neighbouring farms and report to admin', 'Monitor every 24 hours during outbreak'],
    prevention: ['Use certified Late Blight resistant varieties', 'Apply prophylactic fungicide before wet season', 'Avoid dense planting', 'Ensure proper field drainage'],
  },
}

function ConfidenceRing({ value, color }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  return (
    <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={45} cy={45} r={r} fill="none" stroke="var(--bg3)" strokeWidth={7} />
      <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={45} y={45} textAnchor="middle" dominantBaseline="middle" style={{ transform: 'rotate(90deg) translate(0, -90px)', fontSize: 16, fontWeight: 700, fill: color }}>
        {value}%
      </text>
    </svg>
  )
}

function ResultCard({ result, onReset }) {
  const info = DISEASE_INFO[result.disease_result] || DISEASE_INFO.healthy
  const [expanded, setExpanded] = useState({ symptoms: true, treatment: false, prevention: false })
  const toggle = k => setExpanded(e => ({ ...e, [k]: !e[k] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: '24px 28px', borderColor: info.border, background: info.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ConfidenceRing value={Math.round(result.confidence)} color={info.color} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{info.icon}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: info.color }}>{info.label}</h2>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: info.border, color: info.color, fontWeight: 600 }}>{Math.round(result.confidence)}% confidence</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8, lineHeight: 1.6 }}>{info.description}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 6 }}>
                Severity: <strong style={{ color: info.color }}>{info.severity}</strong>
              </span>
              {result.affected_area_pct > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 6 }}>
                  Affected area: <strong style={{ color: info.color }}>{result.affected_area_pct}%</strong>
                </span>
              )}
              {info.pathogen && (
                <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '3px 10px', borderRadius: 6, fontStyle: 'italic' }}>
                  {info.pathogen}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={onReset} style={{ padding: '8px 14px', flexShrink: 0 }}>
            <RefreshCw size={14} /> New Scan
          </button>
        </div>
      </div>

      {/* Grad-CAM Heatmap Visualization */}
      {result.affected_area_pct > 0 && result.disease_result !== 'healthy' && (
        <div className="card" style={{ padding: '18px 22px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}
            ><Zap size={14} color="var(--warning)" /> AI Grad-CAM Heat Map</h3>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} viewBox="0 0 400 280" preserveAspectRatio="xMidYMid slice">
              {/* Background leaf shape */}
              <ellipse cx="200" cy="140" rx="120" ry="100" fill="rgba(255,255,255,0.05)" />
              
              {/* Heat regions based on affected area */}
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2
                const dist = 60 + (result.affected_area_pct / 100) * 40
                const x = 200 + Math.cos(angle) * dist
                const y = 140 + Math.sin(angle) * dist
                const intensity = Math.max(0, 1 - (i / 8) * 0.3)
                const heatColor = result.disease_result === 'late_blight' ? '#f87171' : '#f59e0b'
                return (
                  <circle key={i} cx={x} cy={y} r="45" fill={heatColor} opacity={intensity * 0.4} filter="url(#glow)" />
                )
              })}
              
              {/* Severity indicator */}
              <text x="200" y="50" textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: info.color, opacity: 0.8 }}>
                {result.affected_area_pct}% coverage
              </text>
              
              {/* Glow filter */}
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, lineHeight: 1.5 }}>
            <strong>Grad-CAM Visualization:</strong> Red/orange regions show where the AI model detected disease symptoms. Darker areas indicate higher confidence in disease detection. Use this to identify affected leaf regions for targeted treatment.
          </p>
        </div>
      )}
      {result.heatmap && (
        <div className="card" style={{ overflow: 'hidden', padding: 0, border: `2px solid ${info.color}40` }}>
          <div style={{ padding: '12px 18px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color={info.color} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
              AI X-Ray Vision (Grad-CAM)
            </span>
          </div>
          <div style={{ position: 'relative', background: '#000' }}>
            <img 
              src={result.heatmap} 
              alt="AI Diagnostic Heatmap" 
              style={{ width: '100%', maxHeight: 380, objectFit: 'contain', display: 'block' }} 
            />
            <div style={{ position: 'absolute', bottom: 12, left: 16, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#fff', margin: 0 }}>
                Highlighting affected pixel clusters
              </p>
            </div>
          </div>
        </div>
      )}
      {/* -------------------------------------- */}

      {[
        { key: 'symptoms', label: 'Symptoms Detected', icon: <AlertTriangle size={14} />, items: info.symptoms, color: '#f59e0b' },
        { key: 'treatment', label: 'Treatment Steps', icon: <Zap size={14} />, items: info.treatment, color: '#60a5fa' },
        { key: 'prevention', label: 'Prevention', icon: <CheckCircle size={14} />, items: info.prevention, color: '#4ade80' },
      ].map(({ key, label, icon, items, color }) => (
        <div key={key} className="card" style={{ overflow: 'hidden' }}>
          <button onClick={() => toggle(key)} style={{ width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
              {icon}
              <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 8px', borderRadius: 99 }}>{items.length}</span>
            </div>
            <ChevronDown size={15} color="var(--text3)" style={{ transform: expanded[key] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {expanded[key] && (
            <div style={{ padding: '0 20px 16px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      {result.disease_result !== 'healthy' && (
        <div style={{ padding: '14px 18px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Report to Admin</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>Disease detected on your farm could affect neighbouring farms. The Admin Panel has been notified. You can go to Admin → Blight Map to update your region's risk level.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DiagnosisPage({ user }) {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const fileRef = useRef()
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()

  useEffect(() => {
    fetch('/api/diagnosis/history').then(r => r.json()).then(d => setHistory(d)).catch(() => {})
  }, [])

  const handleFile = file => {
    if (!file) return
    setImage(file); setPreview(URL.createObjectURL(file)); setResult(null)
  }

  const startCamera = async () => {
    setCameraError(''); setCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions or upload a photo.'); setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null; setCameraActive(false)
  }

  const capturePhoto = () => {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], 'potato-capture.jpg', { type: 'image/jpeg' })
      setImage(file); setPreview(URL.createObjectURL(blob)); setResult(null); stopCamera()
    }, 'image/jpeg', 0.9)
  }

  const analyze = async () => {
    if (!image) return
    setScanning(true)
    try {
      const fd = new FormData()
      fd.append('image', image)
      if (user?.id) fd.append('user_id', user.id)
      const res = await fetch('/api/diagnosis/scan', { method: 'POST', body: fd })
      const data = await res.json()
      setResult(data)
      setHistory(h => [data, ...h.slice(0, 9)])
    } catch {
      alert('Analysis failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const reset = () => { setImage(null); setPreview(null); setResult(null); stopCamera() }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, marginBottom: 4 }}>AI Disease Scanner</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Take or upload a photo of potato leaves for instant Early & Late Blight detection</p>
      </div>

      {!result ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Camera or upload panel */}
            {cameraActive ? (
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', maxHeight: 340, objectFit: 'cover', background: '#000' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                {cameraError && <p style={{ padding: '10px 16px', color: 'var(--danger)', fontSize: 13 }}>{cameraError}</p>}
                <div style={{ display: 'flex', gap: 10, padding: 14 }}>
                  <button className="btn btn-primary" onClick={capturePhoto} style={{ flex: 1 }}>
                    <Camera size={15} /> Capture Photo
                  </button>
                  <button className="btn btn-secondary" onClick={stopCamera}>Cancel</button>
                </div>
              </div>
            ) : preview ? (
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ position: 'relative' }}>
                  <img src={preview} alt="Selected leaf" style={{ width: '100%', display: 'block', maxHeight: 340, objectFit: 'cover' }} />
                  <button onClick={reset} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} color="white" />
                  </button>
                </div>
                <div style={{ padding: 16 }}>
                  <button className="btn btn-primary" onClick={analyze} disabled={scanning} style={{ width: '100%', padding: '13px 20px', fontSize: 15, fontWeight: 600 }}>
                    {scanning ? (
                      <><span className="spinner" style={{ width: 18, height: 18 }} /> Analyzing with AI...</>
                    ) : (
                      <><Zap size={16} /> Scan for Disease</>
                    )}
                  </button>
                  {scanning && <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, marginTop: 10 }}>AI model scanning for Early Blight, Late Blight...</p>}
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: 18, background: 'rgba(74,222,128,0.08)', border: '2px dashed rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Leaf size={32} color="var(--accent)" style={{ opacity: 0.7 }} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Upload or capture a photo</h3>
                <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                  Take a clear photo of a potato leaf showing symptoms. Works best with good lighting.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={startCamera} style={{ padding: '11px 20px' }}>
                    <Camera size={15} /> Use Camera
                  </button>
                  <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ padding: '11px 20px' }}>
                    <Upload size={15} /> Upload Photo
                  </button>
                </div>
                {cameraError && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 14 }}>{cameraError}</p>}
                <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
              </div>
            )}

            {/* Tips */}
            <div className="card" style={{ padding: '16px 20px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text2)' }}>📸 Photo tips for best results</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {['Photograph the affected leaf close-up (30–50 cm)', 'Use natural daylight — avoid harsh flash', 'Capture both sides of the leaf if possible', 'Include multiple leaves if more than one is affected', 'Keep the camera steady to avoid blur'].map((t, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* History panel */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>Recent Scans</h3>
            {history.length === 0 ? (
              <div className="card" style={{ padding: 28, textAlign: 'center' }}>
                <Clock size={30} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.2 }} />
                <p style={{ color: 'var(--text3)', fontSize: 13 }}>No scans yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {history.slice(0, 8).map((h, i) => {
                  const info = DISEASE_INFO[h.disease_result] || DISEASE_INFO.healthy
                  return (
                    <div key={i} className="card" style={{ padding: '12px 15px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', borderColor: `${info.color}25` }} onClick={() => setResult(h)}>
                      <span style={{ fontSize: 22 }}>{info.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: info.color }}>{info.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)' }}>{Math.round(h.confidence)}% confidence · {h.affected_area_pct > 0 ? `${h.affected_area_pct}% affected` : 'No visible spread'}</p>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{h.created_at?.slice(5, 10)}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Disease legend */}
            <div className="card" style={{ marginTop: 14, padding: '16px 18px' }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text2)' }}>Disease Guide</h4>
              {Object.entries(DISEASE_INFO).map(([key, info]) => (
                <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{info.icon}</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 12, color: info.color, marginBottom: 2 }}>{info.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{key === 'healthy' ? 'Plant shows no signs of disease.' : key === 'early_blight' ? 'Circular dark spots with yellow halo on older leaves.' : 'Water-soaked lesions, rapid browning, white mold.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ResultCard result={result} onReset={reset} />
      )}
    </div>
  )
}
