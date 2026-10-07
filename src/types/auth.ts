export type UserRole = 'ADMIN' | 'GESTOR' | 'USUARIO'

export interface AuthenticatedUser {
  id: string
  username: string
  name: string
  role: UserRole
  email?: string
}
