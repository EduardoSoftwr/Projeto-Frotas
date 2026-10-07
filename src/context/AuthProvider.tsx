import { useEffect, useState, type ReactNode } from 'react'
import { authenticatePrototypeUser, isAuthenticatedUser, isUserList, prototypeAdmin, toAuthenticatedUser } from '../auth/prototypeAuth'
import { AuthContext } from './AuthContext'
import type { AuthenticatedUser, User, UserSaveResult, UserStatus } from '../types/auth'
import { readStoredValue, removeStoredValue, storageKeys, writeStoredValue } from '../utils/storage'

function readUsers(): User[] {
  const storedUsers = readStoredValue(storageKeys.authUsers, isUserList, [prototypeAdmin])
  const hasPrototypeAdmin = storedUsers.some((user) => user.id === prototypeAdmin.id)
  return hasPrototypeAdmin ? storedUsers : [prototypeAdmin, ...storedUsers.filter((user) => user.username.toLocaleLowerCase('pt-BR') !== 'admin')]
}

function readSession(users: User[]): AuthenticatedUser | null {
  const storedSession = readStoredValue(storageKeys.authSession, (value): value is AuthenticatedUser | null => value === null || isAuthenticatedUser(value), null)
  if (!storedSession) return null
  const account = users.find((user) => user.id === storedSession.id || user.username.toLocaleLowerCase('pt-BR') === storedSession.username.toLocaleLowerCase('pt-BR'))
  return account?.status === 'ATIVO' ? toAuthenticatedUser(account) : null
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(readUsers)
  const [user, setUser] = useState<AuthenticatedUser | null>(() => readSession(users))

  useEffect(() => {
    writeStoredValue(storageKeys.authUsers, users)
  }, [users])

  function login(username: string, password: string) {
    const authenticatedUser = authenticatePrototypeUser(username, password, users)
    if (!authenticatedUser) return false

    writeStoredValue(storageKeys.authSession, authenticatedUser)
    setUser(authenticatedUser)
    return true
  }

  function logout() {
    removeStoredValue(storageKeys.authSession)
    setUser(null)
  }

  function saveUser(nextUser: User): UserSaveResult {
    const existingUser = users.find((item) => item.id === nextUser.id)
    const normalizedUsername = nextUser.username.trim().toLocaleLowerCase('pt-BR')
    const normalizedEmail = nextUser.email.trim().toLocaleLowerCase('pt-BR')
    if (users.some((item) => item.id !== nextUser.id && item.username.trim().toLocaleLowerCase('pt-BR') === normalizedUsername)) return 'duplicate-username'
    if (users.some((item) => item.id !== nextUser.id && item.email.trim().toLocaleLowerCase('pt-BR') === normalizedEmail)) return 'duplicate-email'
    if (existingUser?.id === prototypeAdmin.id && (nextUser.username !== 'admin' || nextUser.role !== 'ADMIN' || nextUser.status !== 'ATIVO' || nextUser.password !== 'admin')) return 'protected-admin'

    const nextUsers = existingUser
      ? users.map((item) => item.id === nextUser.id ? nextUser : item)
      : [...users, nextUser]
    if (!nextUsers.some((item) => item.role === 'ADMIN' && item.status === 'ATIVO')) return 'last-admin'
    setUsers(nextUsers)
    if (user?.id === nextUser.id) {
      const authenticatedUser = toAuthenticatedUser(nextUser)
      setUser(authenticatedUser)
      writeStoredValue(storageKeys.authSession, authenticatedUser)
    }
    return 'saved'
  }

  function setUserStatus(userId: string, status: UserStatus) {
    const targetUser = users.find((item) => item.id === userId)
    if (!targetUser || targetUser.id === prototypeAdmin.id || (user?.id === userId && status === 'INATIVO')) return false
    if (status === 'INATIVO' && targetUser.role === 'ADMIN'
      && !users.some((item) => item.id !== userId && item.role === 'ADMIN' && item.status === 'ATIVO')) return false
    setUsers((current) => current.map((item) => item.id === userId ? { ...item, status } : item))
    return true
  }

  return <AuthContext.Provider value={{ user, users, login, logout, saveUser, setUserStatus }}>{children}</AuthContext.Provider>
}

export default AuthProvider