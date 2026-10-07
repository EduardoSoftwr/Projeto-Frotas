import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, getAuthenticatedUser, loginAdmin, logoutAdmin } from '../services/api'
import type { AuthenticatedUser } from '../types/auth'
import { AuthContext } from './AuthContext'

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    try {
      window.localStorage.removeItem('frota-auth-users-v1')
      window.localStorage.removeItem('frota-auth-session')
    } catch {
      // A indisponibilidade do storage não impede a validação da sessão no backend.
    }

    let mounted = true
    void getAuthenticatedUser()
      .then((authenticatedUser) => { if (mounted) setUser(authenticatedUser) })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setIsAuthLoading(false) })
    return () => { mounted = false }
  }, [])

  async function login(username: string, password: string) {
    try {
      const authenticatedUser = await loginAdmin(username, password)
      setUser(authenticatedUser)
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return false
      throw error
    }
  }

  async function logout() {
    try {
      await logoutAdmin()
    } catch {
      // Mesmo sem resposta do servidor, a interface local encerra a sessão.
    } finally {
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, isAuthLoading, login, logout }}>{children}</AuthContext.Provider>
}

export default AuthProvider
