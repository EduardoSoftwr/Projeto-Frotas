import type { AuthenticatedUser, User } from '../types/auth'

export const prototypeAdmin: User = {
  id: 'prototype-admin',
  username: 'admin',
  email: 'admin@prototipo.local',
  password: 'admin',
  role: 'ADMIN',
  status: 'ATIVO',
  createdAt: '2026-01-01T00:00:00.000Z',
}

export function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.username === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.password === 'string'
    && (candidate.role === 'ADMIN' || candidate.role === 'USUARIO')
    && (candidate.status === 'ATIVO' || candidate.status === 'INATIVO')
    && typeof candidate.createdAt === 'string'
    && Number.isFinite(Date.parse(candidate.createdAt))
}

export function isUserList(value: unknown): value is User[] {
  if (!Array.isArray(value) || !value.every(isUser)) return false
  const usernames = value.map((user) => user.username.trim().toLocaleLowerCase('pt-BR'))
  const emails = value.map((user) => user.email.trim().toLocaleLowerCase('pt-BR'))
  return new Set(usernames).size === usernames.length && new Set(emails).size === emails.length
}

export function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.username === 'string'
    && typeof candidate.name === 'string'
    && (candidate.role === 'ADMIN' || candidate.role === 'GESTOR' || candidate.role === 'USUARIO')
}

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return { id: user.id, username: user.username, name: user.username, email: user.email, role: user.role }
}

// Protótipo local apenas: senhas não devem ser armazenadas assim em produção.
export function authenticatePrototypeUser(username: string, password: string, users: User[]): AuthenticatedUser | null {
  const normalizedUsername = username.trim().toLocaleLowerCase('pt-BR')
  const account = users.find((user) => user.status === 'ATIVO'
    && user.username.trim().toLocaleLowerCase('pt-BR') === normalizedUsername
    && user.password === password)
  return account ? toAuthenticatedUser(account) : null
}