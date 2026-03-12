import { useState, useEffect } from 'react'
import { DB } from './db.js'
import AuthScreen from './AuthScreen.jsx'
import JournalApp from './JournalApp.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // Restore session on load
  useEffect(() => {
    const session = DB.getSession()
    if (session?.username) {
      const users = DB.getUsers()
      if (users[session.username]) {
        setUser(users[session.username])
      }
    }
    setChecking(false)
  }, [])

  const handleAuth = (userData) => {
    DB.saveSession(userData.username)
    setUser(userData)
  }

  const handleSignOut = () => {
    DB.clearSession()
    setUser(null)
  }

  if (checking) {
    return (
      <div
        style={{
          background: '#07090d',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#40586e',
          fontSize: 11,
          letterSpacing: '0.2em',
        }}
      >
        INITIALIZING…
      </div>
    )
  }

  return user ? (
    <JournalApp user={user} onSignOut={handleSignOut} />
  ) : (
    <AuthScreen onAuth={handleAuth} />
  )
}
