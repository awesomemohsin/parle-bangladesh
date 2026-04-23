'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (otpRequested) {
        // Step 2: Verify OTP
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otpCode }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid OTP')
          return
        }

        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        window.location.href = '/admin/dashboard'
      } else {
        // Step 1: Login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Login failed')
          return
        }

        if (data.status === 'otp_required') {
          setOtpRequested(true)
          return
        }

        if (data.user?.role === 'customer') {
          setError('Access denied. Admin privileges required.')
          return
        }

        // Store token (if no OTP was required, though admin should require it now)
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        window.location.href = '/admin/dashboard'
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Parle Admin</h1>
            <p className="text-gray-600 mt-2">{otpRequested ? 'Two-Factor Authentication' : 'Dashboard Login'}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {otpRequested && (
             <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
               An authorization code has been sent to your email.
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!otpRequested ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@parle.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6-Digit OTP Code
                </label>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="text-center tracking-[0.5em] font-mono text-lg"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (otpRequested ? 'Verifying...' : 'Logging in...') : (otpRequested ? 'Verify Code' : 'Login')}
            </Button>
            
            {otpRequested && (
              <button
                type="button"
                onClick={() => { setOtpRequested(false); setOtpCode(''); setError(''); }}
                className="w-full text-xs text-gray-500 hover:text-gray-700 mt-2"
              >
                Back to Login
              </button>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm">
              Back to Store
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
