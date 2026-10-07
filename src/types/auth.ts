export type UserRole = 'ADMIN' | 'GESTOR' | 'USUARIO'
export type ManagedUserRole = 'ADMIN' | 'USUARIO'
export type UserStatus = 'ATIVO' | 'INATIVO'

export interface User {
  id: string
  username: string
  email: string
  password: string
  role: ManagedUserRole
  status: UserStatus
  createdAt: string
}

export interface AuthenticatedUser {
  id: string
  username: string
  name: string
  role: UserRole
  email?: string
}

export type UserSaveResult = 'saved' | 'duplicate-username' | 'duplicate-email' | 'last-admin' | 'protected-admin'