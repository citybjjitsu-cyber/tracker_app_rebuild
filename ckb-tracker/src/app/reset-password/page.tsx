'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

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
      await resetApi.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to reset password.'
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
        <h2 style={{ color: '#fff', margin: '0 0 8px' }}>Password Reset!</h2>
        <p style={{ color: '#888', margin: 0 }}>Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ color: '#fff', margin: '0 0 24px' }}>Reset Password</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="New Password"
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
        {error && <p style={{ color: '#ef4444', fontSize: 14, margin: 0 }}>{error}</p>}
        <Button type="submit" disabled={submitting || !password || password !== confirmPassword}>
          {submitting ? 'Resetting...' : 'Reset Password'}
        </Button>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
