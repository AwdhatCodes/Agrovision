import React, { useState, useEffect } from 'react'
import { Sprout, ShoppingBasket, LayoutDashboard, ShieldCheck, Map, Bell, Microscope, LogOut, ChevronDown, User } from 'lucide-react'
import Marketplace from './pages/Marketplace.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import FarmMap from './pages/FarmMap.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DiagnosisPage from './pages/DiagnosisPage.jsx'

const NAV = [
  { id: 'market', label: 'Marketplace', icon: ShoppingBasket },
  { id: 'map', label: 'Farm Map', icon: Map },
  { id: 'scan', label: 'AI Scan', icon: Microscope },
  { id: 'seller', label: 'Seller Dashboard', icon: LayoutDashboard },
  { id: 'admin', label: 'Admin Panel', icon: ShieldCheck },
]

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 99, padding: '5px 12px 5px 5px', cursor: 'pointer' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: user.avatar_color || '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0a1a0f', flexShrink: 0 }}>
          {initials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
        <ChevronDown size={13} color="var(--text3)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: '110%', right: 0, minWidth: 200, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 50, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{user.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>{user.email}</p>
              <span style={{ marginTop: 6, display: 'inline-flex', fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', color: 'var(--accent)', border: '1px solid rgba(74,222,128,0.2)', textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            <button onClick={() => { setOpen(false); onLogout() }} style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13, textAlign: 'left' }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [page, setPage] = useState('market')
  const [alerts, setAlerts] = useState([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [seenCount, setSeenCount] = useState(0)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('fm_token')
    const stored = localStorage.getItem('fm_user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
        // Verify token is still valid
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(u => { if (u) setUser(u); else logout() })
          .catch(() => {})
      } catch { logout() }
    }
    setAuthChecked(true)
  }, [])

  useEffect(() => {
    if (!user) return
    const load = () => fetch('/api/alerts').then(r => r.json()).then(setAlerts).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [user])

  const handleAuth = (u) => { setUser(u); setPage('market') }

  const logout = () => {
    localStorage.removeItem('fm_token')
    localStorage.removeItem('fm_user')
    setUser(null); setPage('market')
  }

  const unread = alerts.length - seenCount

  if (!authChecked) return null
  if (!user) return <AuthPage onAuth={handleAuth} />

  const visibleNav = NAV.filter(n => {
    if (n.id === 'admin' && user.role !== 'admin') return false
    if (n.id === 'seller' && user.role === 'buyer') return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 4, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sprout size={17} color="var(--accent)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>FarmMarket</span>
          </div>

          <nav style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
            {visibleNav.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPage(id)} className="btn btn-ghost" style={{
                color: page === id ? 'var(--accent)' : 'var(--text2)',
                background: page === id ? 'rgba(74,222,128,0.08)' : 'transparent',
                borderRadius: 8, padding: '7px 12px', fontSize: 13,
                fontWeight: page === id ? 600 : 400, whiteSpace: 'nowrap', flexShrink: 0
              }}>
                <Icon size={14} />{label}
                {id === 'scan' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', opacity: 0.8 }} />}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost" onClick={() => { setShowAlerts(s => !s); setSeenCount(alerts.length) }} style={{ padding: '7px 10px', position: 'relative', color: unread > 0 ? 'var(--warning)' : 'var(--text2)' }}>
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
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Blight Alerts</span>
                      <span className="badge badge-red" style={{ fontSize: 10 }}>{alerts.length} active</span>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {alerts.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No alerts</div>
                      ) : alerts.map(a => (
                        <div key={a.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.severity === 'outbreak' ? 'var(--danger)' : 'var(--warning)', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <p style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.5 }}>{a.message}</p>
                            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{a.region}</span>
                              {a.simulated_email === 1 && <span style={{ fontSize: 10, color: 'var(--blue)', background: 'rgba(96,165,250,0.1)', padding: '1px 6px', borderRadius: 4 }}>📧 Email</span>}
                              {a.simulated_sms === 1 && <span style={{ fontSize: 10, color: 'var(--accent)', background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 4 }}>📱 SMS</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <UserMenu user={user} onLogout={logout} />
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {page === 'market' && <Marketplace />}
        {page === 'map' && <FarmMap />}
        {page === 'scan' && <DiagnosisPage user={user} />}
        {page === 'seller' && <SellerDashboard />}
        {page === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
