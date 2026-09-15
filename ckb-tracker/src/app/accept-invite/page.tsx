'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { inviteApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [error, setError] = useState('')

  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('No invite token provided. Check your email for the full link.')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValidating(false)
      return
    }

    inviteApi.validate(token)
      .then((data) => {
        if (data.valid) {
          setValid(true)
          setUserName(`${data.first_name} ${data.last_name}`)
          setUserEmail(data.email)
        } else {
          setError('This invite is invalid or has expired.')
        }
        setValidating(false)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'This invite is invalid or has expired.')
        setValidating(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await inviteApi.accept(token, password, pin)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to set up account. Please try again.'
      setError(detail)
      setSubmitting(false)
    }
  }

  if (validating) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ color: '#888' }}>Validating your invite link...</p>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h2 style={{ color: '#fff', margin: '0 0 8px' }}>Account Set Up!</h2>
        <p style={{ color: '#888', margin: 0 }}>Redirecting you to login...</p>
      </div>
    )
  }

  if (!valid) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
        <h2 style={{ color: '#fff', margin: '0 0 8px' }}>Invalid Invite</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>{error}</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: '#fff', margin: '0 0 4px' }}>Welcome, {userName}!</h2>
      <p style={{ color: '#888', margin: '0 0 24px', fontSize: 14 }}>{userEmail}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <div style={{ fontSize: 12, color: '#888', marginTop: -8 }}>
          Must include: uppercase, lowercase, digit, and special character
        </div>
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
        <Input
          label="Kiosk PIN"
          type="password"
          placeholder="4-8 digit PIN for kiosk check-in"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          required
          minLength={4}
          maxLength={8}
        />
        <div style={{ fontSize: 12, color: '#888', marginTop: -8 }}>
          PIN must be 4-8 digits
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>{error}</p>}

        <Button type="submit" disabled={submitting || !password || !pin || password !== confirmPassword}>
          {submitting ? 'Setting up...' : 'Set Up Account'}
        </Button>
      </div>
    </form>
  )
}

export default function AcceptInvitePage() {
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
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>Set up your account</p>
        </div>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading...</div>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  )
}
