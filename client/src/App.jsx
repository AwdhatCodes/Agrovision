import React, { useState, useEffect } from 'react'
import { Sprout, ShoppingBasket, LayoutDashboard, ShieldCheck, Map, Bell } from 'lucide-react'
import Marketplace from './pages/Marketplace.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import FarmMap from './pages/FarmMap.jsx'

const NAV = [
  { id: 'market', label: 'Marketplace', icon: ShoppingBasket },
  { id: 'map', label: 'Farm Map', icon: Map },
  { id: 'seller', label: 'Seller Dashboard', icon: LayoutDashboard },
  { id: 'admin', label: 'Admin Panel', icon: ShieldCheck },
]

export default function App() {
  const [page, setPage] = useState('market')
  const [alerts, setAlerts] = useState([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [seenCount, setSeenCount] = useState(0)

  useEffect(() => {
    const load = () => fetch('/api/alerts').then(r => r.json()).then(setAlerts)
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  const unread = alerts.length - seenCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 24, height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
            <div style={{ width: 34, height: 34, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sprout size={18} color="var(--accent)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>FarmMarket</span>
          </div>
          <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPage(id)} className="btn btn-ghost" style={{
                color: page === id ? 'var(--accent)' : 'var(--text2)',
                background: page === id ? 'rgba(74,222,128,0.08)' : 'transparent',
                borderRadius: 8, padding: '7px 13px', fontSize: 13,
                fontWeight: page === id ? 600 : 400,
              }}>
                <Icon size={15} />{label}
              </button>
            ))}
          </nav>

          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowAlerts(s => !s); setSeenCount(alerts.length) }}
              style={{ padding: '7px 10px', position: 'relative', color: unread > 0 ? 'var(--warning)' : 'var(--text2)' }}
            >
              <Bell size={17} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, background: 'var(--danger)', borderRadius: '50%', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showAlerts && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowAlerts(false)} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 360, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Disease Alerts</span>
                    <span className="badge badge-red" style={{ fontSize: 10 }}>{alerts.length} active</span>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {alerts.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No alerts</div>
                    ) : alerts.map(a => (
                      <div key={a.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.severity === 'outbreak' ? 'var(--danger)' : 'var(--warning)', marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 13, marginBottom: 3, lineHeight: 1.5 }}>{a.message}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{a.region}</span>
                            {a.simulated_email === 1 && <span style={{ fontSize: 10, color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', padding: '1px 6px', borderRadius: 4 }}>📧 Email sent</span>}
                            {a.simulated_sms === 1 && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 4 }}>📱 SMS sent</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {page === 'market' && <Marketplace />}
        {page === 'map' && <FarmMap />}
        {page === 'seller' && <SellerDashboard />}
        {page === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
