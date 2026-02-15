import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react'

type AuthTab = 'signin' | 'signup'

interface AuthModalProps {
  onClose: () => void
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>
  onSignUp: (email: string, password: string) => Promise<{ error?: string }>
  onGoogleSignIn: () => Promise<void>
  onMagicLink: (email: string) => Promise<{ error?: string }>
}

export function AuthModal({ onClose, onSignIn, onSignUp, onGoogleSignIn, onMagicLink }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
    setSuccessMessage('')
    setMagicLinkSent(false)
    setShowMagicLink(false)
  }

  const handleTabSwitch = (newTab: AuthTab) => {
    resetForm()
    setTab(newTab)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (showMagicLink) {
      setIsLoading(true)
      setError('')
      const result = await onMagicLink(email.trim())
      setIsLoading(false)
      if (result.error) {
        setError(result.error)
      } else {
        setMagicLinkSent(true)
      }
      return
    }

    if (!password) {
      setError('Password is required')
      return
    }

    if (tab === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setError('')

    const result = tab === 'signin'
      ? await onSignIn(email.trim(), password)
      : await onSignUp(email.trim(), password)

    setIsLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      if (tab === 'signup') {
        setError('')
        setTab('signin')
        setPassword('')
        setSuccessMessage('Account created! Check your email to confirm, then sign in.')
      } else {
        onClose()
      }
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    await onGoogleSignIn()
    setIsLoading(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md glass glow-sm overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-4">
              <Sparkles className="w-3 h-3 text-brand-400" />
              <span className="text-[10px] font-medium text-brand-300 tracking-wide uppercase">
                {tab === 'signin' ? 'Welcome back' : 'Get started'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white/90 mb-1">
              {tab === 'signin' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-sm text-white/30">
              {tab === 'signin'
                ? 'Access your research and saved reports'
                : 'Start researching companies in seconds'}
            </p>
          </div>

          {/* Tabs */}
          <div className="px-8 mb-4">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleTabSwitch('signin')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  tab === 'signin'
                    ? 'bg-white/[0.08] text-white/80 shadow-sm'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  tab === 'signup'
                    ? 'bg-white/[0.08] text-white/80 shadow-sm'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-3">
            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-medium text-white/70 hover:text-white/90 hover:bg-white/[0.09] transition-all disabled:opacity-40"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/20 uppercase tracking-wider font-medium">or</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {magicLinkSent ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-6 text-center space-y-2"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-white/80">Check your email</p>
                <p className="text-xs text-white/30">
                  We sent a magic link to <span className="text-white/50">{email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-2"
                >
                  Try a different email
                </button>
              </motion.div>
            ) : (
              <>
                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-500/30 focus:bg-white/[0.06] transition-all"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {/* Password (hidden for magic link) */}
                {!showMagicLink && (
                  <motion.div
                    initial={{ opacity: 1, height: 'auto' }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative"
                  >
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tab === 'signup' ? 'Create a password (min 6 chars)' : 'Your password'}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-500/30 focus:bg-white/[0.06] transition-all"
                      disabled={isLoading}
                    />
                  </motion.div>
                )}

                {/* Success */}
                <AnimatePresence>
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-emerald-300/80">{successMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-300/80">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-brand-500/40"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {showMagicLink ? (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Send Magic Link</span>
                        </>
                      ) : (
                        <>
                          <span>{tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </>
                  )}
                </motion.button>

                {/* Toggle magic link */}
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMagicLink(!showMagicLink)
                      setError('')
                    }}
                    className="w-full text-center text-xs text-white/25 hover:text-white/40 transition-colors py-1"
                  >
                    {showMagicLink ? 'Use password instead' : 'Sign in with magic link'}
                  </button>
                )}
              </>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
