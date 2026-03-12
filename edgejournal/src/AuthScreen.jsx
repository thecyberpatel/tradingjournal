import { useState } from 'react'
import { DB } from './db.js'
import { C } from './constants.js'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const handleSubmit = async () => {
    reset()
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        const result = await DB.createUser(username.trim(), password)
        if (!result.ok) { setError(result.error); setLoading(false); return }
        setSuccess('Account created! Signing you in…')
        await new Promise((r) => setTimeout(r, 700))
        const si = await DB.signIn(username.trim(), password)
        if (si.ok) onAuth(si.user)
      } else {
        const result = await DB.signIn(username.trim(), password)
        if (!result.ok) { setError(result.error); setLoading(false); return }
        onAuth(result.user)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'JetBrains Mono', monospace",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${C.border}50 1px, transparent 1px), linear-gradient(90deg, ${C.border}50 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.4,
        }}
      />
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          background: `radial-gradient(circle, ${C.accent}07 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: 420, position: 'relative', zIndex: 1 }} className="slide-up">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: C.accentDim,
                border: `1px solid ${C.accent}44`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  background: C.accent,
                  borderRadius: '50%',
                  boxShadow: `0 0 16px ${C.accent}`,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: C.text,
              }}
            >
              EDGE<span style={{ color: C.accent }}>JOURNAL</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: '0.2em' }}>
            PROFESSIONAL TRADE JOURNAL
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 36,
            boxShadow: `0 32px 80px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              marginBottom: 28,
              background: '#ffffff06',
              borderRadius: 6,
              padding: 3,
            }}
          >
            {[['signin', 'SIGN IN'], ['signup', 'SIGN UP']].map(([m, l]) => (
              <button
                key={m}
                onClick={() => { setMode(m); reset(); setPassword(''); setConfirmPassword('') }}
                style={{
                  flex: 1,
                  padding: '9px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  fontFamily: "'JetBrains Mono', monospace",
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 4,
                  background: mode === m ? C.accent : 'transparent',
                  color: mode === m ? '#000' : C.textMuted,
                  transition: 'all .2s',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', marginBottom: 6 }}>
                USERNAME
              </div>
              <input
                className="inp"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); reset() }}
                onKeyDown={handleKey}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', marginBottom: 6 }}>
                PASSWORD
              </div>
              <input
                className="inp"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); reset() }}
                onKeyDown={handleKey}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>

            {mode === 'signup' && (
              <div className="fade-in">
                <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: '0.12em', marginBottom: 6 }}>
                  CONFIRM PASSWORD
                </div>
                <input
                  className="inp"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); reset() }}
                  onKeyDown={handleKey}
                  autoComplete="new-password"
                />
                <div style={{ marginTop: 8, fontSize: 9, color: C.textMuted, lineHeight: 1.7 }}>
                  Username: letters, numbers, underscores (min 3 chars)
                  <br />
                  Password: minimum 6 characters
                </div>
              </div>
            )}

            {error && (
              <div
                className="fade-in"
                style={{
                  background: '#ff3d5a15',
                  border: '1px solid #ff3d5a35',
                  padding: '10px 13px',
                  borderRadius: 4,
                  fontSize: 11,
                  color: C.red,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ⚠ {error}
              </div>
            )}

            {success && (
              <div
                className="fade-in"
                style={{
                  background: C.accentDim,
                  border: `1px solid ${C.accent}35`,
                  padding: '10px 13px',
                  borderRadius: 4,
                  fontSize: 11,
                  color: C.accent,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ✓ {success}
              </div>
            )}

            <button
              className="btn-p"
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: 12, letterSpacing: '0.12em', marginTop: 4 }}
            >
              {loading ? '◌' : mode === 'signin' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
            </button>
          </div>

          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 10, color: C.textMuted }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <span
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                reset(); setPassword(''); setConfirmPassword('')
              }}
              style={{ color: C.accent, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </span>
          </div>
        </div>

        <div
          style={{ textAlign: 'center', marginTop: 20, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em' }}
        >
          Passwords hashed with SHA-256 · Data stored locally in your browser
        </div>
      </div>
    </div>
  )
}
