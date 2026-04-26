'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, ShieldCheck, Mail, CheckCircle2, User as UserIcon, Phone, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface UserProfile {
  name: string
  email: string
  mobile: string
  role: string
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/admin/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (error) {
        toast.error('Failed to load profile data')
      } finally {
        setIsFetching(false)
      }
    }
    fetchProfile()
  }, [])

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword) {
      toast.error('Old password is required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/change-password/request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Security OTP sent to your email')
        setStep('otp')
      } else {
        toast.error(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/change-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ otpCode, oldPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password updated successfully')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setOtpCode('')
        setStep('form')
      } else {
        toast.error(data.error || 'Failed to update password')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Identity & Security</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manage your profile and administrative credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-2xl bg-gray-900 text-white p-8 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center mb-6 border border-white/10 group-hover:scale-105 transition-transform duration-500">
                <UserIcon className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight">{profile?.name}</h2>
              <span className="bg-red-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest mt-2 shadow-xl shadow-red-900/50">
                {profile?.role.replace('_', ' ')}
              </span>

              <div className="w-full mt-10 space-y-4 text-left">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Email Identity</span>
                    <span className="text-[11px] font-bold truncate">{profile?.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Mobile Identity</span>
                    <span className="text-[11px] font-bold">{profile?.mobile}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[60px] pointer-events-none" />
          </Card>

          <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
             <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                Important: You need your old password and the email code to change your password. This will also log you out of all other devices.
             </p>
          </div>
        </div>

        {/* Right Column: Security Controls */}
        <div className="lg:col-span-8">
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 md:p-12 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleRequestOTP} 
                  className="space-y-6"
                >
                  <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tight mb-8">Change Your Password</h3>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <Input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-gray-50 border-gray-100 focus:border-red-600 rounded-2xl h-14 pl-12 text-[13px] font-bold transition-all shadow-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-gray-50 border-gray-100 focus:border-red-600 rounded-2xl h-14 pl-12 text-[13px] font-bold transition-all shadow-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-gray-50 border-gray-100 focus:border-red-600 rounded-2xl h-14 pl-12 text-[13px] font-bold transition-all shadow-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-14 bg-gray-900 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-gray-200"
                    >
                      {isLoading ? "Synchronizing..." : "Initiate Change Protocol"}
                    </Button>
                  </div>
                </motion.form>
              ) : (
                <motion.form 
                  key="otp"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  onSubmit={handleConfirmChange} 
                  className="space-y-8 text-center py-4"
                >
                  <div className="space-y-2">
                     <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4">
                        <Mail className="w-8 h-8" />
                     </div>
                     <h3 className="text-lg font-black uppercase italic tracking-tight">Security Notice</h3>
                     <p className="text-[11px] text-gray-400 mt-2 leading-relaxed font-medium">
                        Changing your password is a 2-step process. We will send a code to your email to make sure it's really you.
                     </p>
                  </div>

                  <div className="max-w-[240px] mx-auto">
                    <Input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-3xl font-black tracking-[0.5em] h-20 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-red-600/20"
                      required
                    />
                  </div>

                  <div className="space-y-4 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-14 bg-red-600 hover:bg-gray-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-red-100"
                    >
                      {isLoading ? "Verifying..." : "Confirm Password Change"}
                    </Button>
                    
                    <button 
                      type="button" 
                      onClick={() => setStep('form')}
                      className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  )
}
