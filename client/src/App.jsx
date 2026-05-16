import React, { useState } from 'react'
import { Sprout, ShoppingBasket, LayoutDashboard, ShieldCheck } from 'lucide-react'
import Marketplace from './pages/Marketplace.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import AdminPanel from './pages/AdminPanel.jsx'

const NAV = [
  { id: 'market', label: 'Marketplace', icon: ShoppingBasket },
  { id: 'seller', label: 'Seller Dashboard', icon: LayoutDashboard },
  { id: 'admin', label: 'Admin Panel', icon: ShieldCheck },
]

export default function App() {
  const [page, setPage] = useState('market')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 32, height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
            <div style={{ width: 34, height: 34, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sprout size={18} color="var(--accent)" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>FarmMarket</span>
          </div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setPage(id)}
                className="btn btn-ghost"
                style={{
                  color: page === id ? 'var(--accent)' : 'var(--text2)',
                  background: page === id ? 'rgba(74,222,128,0.08)' : 'transparent',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: page === id ? 600 : 400,
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        {page === 'market' && <Marketplace />}
        {page === 'seller' && <SellerDashboard />}
        {page === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
