import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Music2, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { showToast } from '../utils/toast.js'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !email || !password) return
    setError('')
    setSubmitting(true)
    try {
      await register({ name, email, password })
      showToast('Account created')
      navigate('/')
    } catch (err) {
      setError(err.message || 'Could not create account')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="aurora-glow">
        <span />
        <span />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-fill flex items-center justify-center">
            <Music2 size={20} color="var(--on-accent)" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">AraaMusic</span>
        </Link>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]/80 backdrop-blur p-6 sm:p-8 shadow-2xl">
          <h1 className="font-display text-xl font-bold mb-1 text-center">Create your account</h1>
          <p className="text-sm text-[var(--text-dim)] text-center mb-6">Free forever, cancel any time</p>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-3.5 py-2.5 mb-4 text-sm text-[var(--danger)]">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="text-xs text-[var(--text-dim)] mb-1 block">Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="text-xs text-[var(--text-dim)] mb-1 block">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="text-xs text-[var(--text-dim)] mb-1 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 flex items-center justify-center gap-2 rounded-full gradient-fill py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ color: 'var(--on-accent)' }}
            >
              {submitting ? 'Creating account…' : 'Create account'} <ArrowRight size={15} />
            </button>
          </form>

          <p className="text-sm text-[var(--text-dim)] text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent-a)] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
        <p className="text-xs text-[var(--text-faint)] text-center mt-6">
          Your account is created on your own local AraaMusic server.
        </p>
      </div>
    </div>
  )
}
