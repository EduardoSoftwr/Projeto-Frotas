import { randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'

export const authCookieName = 'frota_admin_session'
const sessionDurationSeconds = 8 * 60 * 60
const sessions = new Map<string, { userId: string; expiresAt: number }>()

export interface PublicUser {
  id: string
  username: string
  email: string
  role: 'ADMIN' | 'USER'
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production'
  return `Path=/api; HttpOnly; SameSite=${secure ? 'None' : 'Lax'}${secure ? '; Secure' : ''}`
}

function readSessionId(request: Request) {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null
  const cookie = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${authCookieName}=`))
  return cookie?.slice(authCookieName.length + 1) || null
}

export function setAuthSession(response: Response, userId: string) {
  const now = Date.now()
  for (const [sessionId, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(sessionId)
  }
  const sessionId = randomBytes(32).toString('base64url')
  sessions.set(sessionId, { userId, expiresAt: now + sessionDurationSeconds * 1000 })
  response.setHeader('Set-Cookie', `${authCookieName}=${sessionId}; ${cookieOptions()}; Max-Age=${sessionDurationSeconds}`)
}

export function clearAuthSession(request: Request, response: Response) {
  const sessionId = readSessionId(request)
  if (sessionId) sessions.delete(sessionId)
  response.setHeader('Set-Cookie', `${authCookieName}=; ${cookieOptions()}; Max-Age=0`)
}

export function readAuthSession(request: Request) {
  const sessionId = readSessionId(request)
  if (!sessionId) return null
  const session = sessions.get(sessionId)
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionId)
    return null
  }
  return session
}
