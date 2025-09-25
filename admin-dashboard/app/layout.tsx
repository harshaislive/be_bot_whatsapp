import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Beforest Message Admin',
  description: 'Admin dashboard for managing WhatsApp bot messages',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
          {/* Modern Header with better hierarchy */}
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
                  <div className="hidden sm:block">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-600 font-medium">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content with better spacing */}
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}