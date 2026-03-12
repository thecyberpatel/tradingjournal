// ─── CRYPTO ────────────────────────────────────────────────────────────────
export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── LOCAL STORAGE HELPERS ─────────────────────────────────────────────────
function lsGet(key) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function lsDel(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}

// ─── DATABASE API ──────────────────────────────────────────────────────────
export const DB = {
  // ── Users ──
  getUsers() {
    return lsGet('ej:users') || {}
  },

  saveUsers(users) {
    return lsSet('ej:users', users)
  },

  async createUser(username, password) {
    const trimmed = username.trim()
    if (trimmed.length < 3)
      return { ok: false, error: 'Username must be at least 3 characters' }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
      return { ok: false, error: 'Username: letters, numbers, underscores only' }
    if (password.length < 6)
      return { ok: false, error: 'Password must be at least 6 characters' }

    const users = DB.getUsers()
    const key = trimmed.toLowerCase()
    if (users[key]) return { ok: false, error: 'Username already taken' }

    const passwordHash = await hashPassword(password)
    users[key] = {
      username: key,
      displayName: trimmed,
      passwordHash,
      createdAt: new Date().toISOString(),
    }
    DB.saveUsers(users)
    return { ok: true }
  },

  async signIn(username, password) {
    const users = DB.getUsers()
    const key = username.trim().toLowerCase()
    const user = users[key]
    if (!user) return { ok: false, error: 'Username not found' }
    const hash = await hashPassword(password)
    if (hash !== user.passwordHash) return { ok: false, error: 'Incorrect password' }
    return { ok: true, user }
  },

  // ── Session ──
  getSession() {
    return lsGet('ej:session')
  },

  saveSession(username) {
    lsSet('ej:session', { username, savedAt: new Date().toISOString() })
  },

  clearSession() {
    lsDel('ej:session')
  },

  // ── User Data ──
  getTrades(username) {
    return lsGet(`ej:u:${username}:trades`)
  },

  saveTrades(username, trades) {
    lsSet(`ej:u:${username}:trades`, trades)
  },

  getPlans(username) {
    return lsGet(`ej:u:${username}:plans`) || []
  },

  savePlans(username, plans) {
    lsSet(`ej:u:${username}:plans`, plans)
  },

  getSettings(username) {
    return lsGet(`ej:u:${username}:settings`)
  },

  saveSettings(username, settings) {
    lsSet(`ej:u:${username}:settings`, settings)
  },
}
