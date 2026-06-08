import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { X } from 'lucide-react'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || window.__STRIPE_PUBLISHABLE_KEY__
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

export default function StripeCheckout({ product, quantity, buyerLocation, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const createSession = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            quantity: quantity || 1,
            buyer_name: 'Customer', // Can be updated from form
            buyer_email: 'customer@example.com', // Can be updated from form
            buyer_region: buyerLocation?.region || '',
            buyer_location: buyerLocation?.label || '',
            buyer_lat: buyerLocation?.lat || '',
            buyer_lng: buyerLocation?.lng || '',
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create checkout session')
        }

        const data = await response.json()
        setClientSecret(data.clientSecret)
      } catch (err) {
        console.error('[v0] Stripe session error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    createSession()
  }, [product.id, quantity, buyerLocation])

  if (!stripePromise) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 500 }}>
          <div className="modal-header">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Configuration Error</h2>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>Stripe setup</p>
            </div>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>
              <X size={16} />
            </button>
          </div>
          <div className="modal-body" style={{ padding: 16 }}>
            <div style={{ padding: 16, background: 'rgba(248,113,113,0.1)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
              <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Stripe publishable key not configured</p>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Please check your environment variables: VITE_STRIPE_PUBLISHABLE_KEY or STRIPE_PUBLISHABLE_KEY</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Secure Checkout</h2>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Complete your purchase with Stripe</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <span className="spinner" style={{ width: 24, height: 24 }} />
              <p style={{ marginTop: 12, color: 'var(--text3)' }}>Loading checkout...</p>
            </div>
          ) : error ? (
            <div style={{ padding: 16, background: 'rgba(248,113,113,0.1)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
              <p style={{ color: 'var(--danger)' }}>{error}</p>
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
                Try Again
              </button>
            </div>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret, onComplete: onSuccess }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : null}
        </div>
      </div>
    </div>
  )
}
