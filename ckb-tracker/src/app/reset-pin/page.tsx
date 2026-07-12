'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function ResetPinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (pin !== confirmPin) {
      setError('PINs do not match.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await resetApi.resetPin(token, pin)
      setSuccess(true)
      setTimeout(() => router.push('/'), 2000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to reset PIN.'
      setError(detail)
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <p style={{ color: '#ef4444' }}>Missing reset token. Check your email for the full link.</p>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#fff', margin: '0 0 8px' }}>PIN Reset!</h2>
        <p style={{ color: '#888', margin: 0 }}>Redirecting to the kiosk...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: '#fff', margin: '0 0 24px' }}>Reset Kiosk PIN</h2>
      <p style={{ color: '#888', margin: '0 0 16px', fontSize: 14 }}>
        Your PIN is used to check in at the gym kiosk.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="New PIN"
          type="password"
          placeholder="4-8 digits"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          required
          minLength={4}
          maxLength={8}
        />
        <Input
          label="Confirm PIN"
          type="password"
          placeholder="Re-enter your PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          required
          minLength={4}
          maxLength={8}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>{error}</p>}
        <Button type="submit" disabled={submitting || !pin || pin !== confirmPin}>
          {submitting ? 'Resetting...' : 'Reset PIN'}
        </Button>
      </div>
    </form>
  )
}

export default function ResetPinPage() {
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
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading...</div>}>
          <ResetPinForm />
        </Suspense>
      </div>
    </div>
  )
}
