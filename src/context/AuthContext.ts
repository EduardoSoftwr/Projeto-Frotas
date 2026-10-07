import { createContext } from 'react'
import type { AuthenticatedUser } from '../types/auth'

export interface AuthContextValue {
  user: AuthenticatedUser | null
  isAuthLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
