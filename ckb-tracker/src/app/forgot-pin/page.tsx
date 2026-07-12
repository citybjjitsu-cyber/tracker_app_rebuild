'use client'

import { useState } from 'react'
import { resetApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPinPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await resetApi.forgotPin(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ color: '#fff', margin: '0 0 8px' }}>Check Your Email</h2>
          <p style={{ color: '#888', margin: 0, fontSize: 14 }}>
            If an account exists for {email}, we&apos;ve sent a PIN reset link.
          </p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h2 style={{ color: '#fff', margin: '0 0 4px' }}>Forgot PIN</h2>
      <p style={{ color: '#888', margin: '0 0 24px', fontSize: 14 }}>
        Enter your email and we&apos;ll send you a link to reset your kiosk PIN.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>{error}</p>}
          <Button type="submit" disabled={submitting || !email}>
            {submitting ? 'Sending...' : 'Send PIN Reset Link'}
          </Button>
        </div>
      </form>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f0f',
      padding: 16,
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        padding: 40,
        width: '100%',
        maxWidth: 420,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ color: '#fff', fontSize: 24, margin: '0 0 4px' }}>CKB Tracker</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
