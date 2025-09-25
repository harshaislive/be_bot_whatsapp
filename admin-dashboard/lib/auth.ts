'use client'

export interface AuthConfig {
  username: string
  password: string
}

const AUTH_KEY = 'admin_auth_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export const authConfig: AuthConfig = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin',
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'
}

export interface AuthSession {
  authenticated: boolean
  timestamp: number
  username: string
}

export const authService = {
  login(username: string, password: string): boolean {
    if (username === authConfig.username && password === authConfig.password) {
      const session: AuthSession = {
        authenticated: true,
        timestamp: Date.now(),
        username
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(session))
      return true
    }
    return false
  },

  logout(): void {
    localStorage.removeItem(AUTH_KEY)
  },

  isAuthenticated(): boolean {
    try {
      const sessionData = localStorage.getItem(AUTH_KEY)
      if (!sessionData) return false

      const session: AuthSession = JSON.parse(sessionData)
      const now = Date.now()

      // Check if session is expired
      if (now - session.timestamp > SESSION_DURATION) {
        this.logout()
        return false
      }

      // Extend session on activity
      session.timestamp = now
      localStorage.setItem(AUTH_KEY, JSON.stringify(session))

      return session.authenticated
    } catch {
      return false
    }
  },

  getSession(): AuthSession | null {
    try {
      const sessionData = localStorage.getItem(AUTH_KEY)
      if (!sessionData) return null
      return JSON.parse(sessionData)
    } catch {
      return null
    }
  }
}