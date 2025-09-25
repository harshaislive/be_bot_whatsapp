'use client'

import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { LoginForm } from '@/components/login-form'
import { Button } from '@/components/ui/button'
import { LogOut, User, Shield } from 'lucide-react'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        const session = authService.getSession()
        setUsername(session?.username || '')
      }
    }

    checkAuth()

    // Check auth status on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Check auth periodically
    const interval = setInterval(checkAuth, 60000) // Check every minute

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
    const session = authService.getSession()
    setUsername(session?.username || '')
  }

  const handleLogout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUsername('')
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Loading Admin Panel</p>
            <p className="text-sm text-gray-500">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated - show login form
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  // Authenticated - show main content with logout option
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Enhanced Header with logout */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-lg">
                B
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Beforest Admin
                </h1>
                <p className="text-xs text-gray-500">
                  WhatsApp Message Management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-gray-600 font-medium">
                    Signed in as {username}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 font-medium">Live</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}