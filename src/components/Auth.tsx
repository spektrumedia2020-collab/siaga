import { useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import './Auth.css'

interface AuthProps {
  onLoginSuccess: () => void
}

export function Auth({ onLoginSuccess }: AuthProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()

      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        onLoginSuccess()
      } else {
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setEmail('')
        setPassword('')
        alert('Check your email untuk verifikasi!')
        setIsLogin(true)
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.jpeg" alt="SiAga Logo" className="auth-logo" />
          <h1 className="auth-title">SiAga</h1>
          <p className="auth-subtitle">Sistem Informasi Manajemen Pasar</p>
        </div>
        
        <h2 className="auth-form-title">{isLogin ? 'Login' : 'Daftar'}</h2>
        
        {error && <div className="error-message">{error}</div>}

        {isLogin && (
          <div className="test-accounts" aria-label="Akun test">
            <p className="test-accounts-title">Akun test</p>
            <div className="test-account-actions">
              <button
                type="button"
                className="test-account-button"
                onClick={() => {
                  setEmail('kepala@siaga.id')
                  setPassword('DemiSiaga2026!')
                  setError('')
                }}
              >
                Kepala
              </button>
              <button
                type="button"
                className="test-account-button"
                onClick={() => {
                  setEmail('admin@siaga.id')
                  setPassword('DemiSiaga2026!')
                  setError('')
                }}
              >
                Admin
              </button>
              <button
                type="button"
                className="test-account-button"
                onClick={() => {
                  setEmail('bendahara@siaga.id')
                  setPassword('DemiSiaga2026!')
                  setError('')
                }}
              >
                Bendahara
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Daftar'}
          </button>
        </form>

        <p className="toggle-auth">
          {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="link-button"
          >
            {isLogin ? 'Daftar' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}
