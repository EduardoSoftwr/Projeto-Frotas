import { createContext } from 'react'
import type { AuthenticatedUser, User, UserSaveResult, UserStatus } from '../types/auth'

export interface AuthContextValue {
  user: AuthenticatedUser | null
  users: User[]
  login: (username: string, password: string) => boolean
  logout: () => void
  saveUser: (user: User) => UserSaveResult
  setUserStatus: (userId: string, status: UserStatus) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)