import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'
import type { RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'
import { clearAuthSession, setAuthSession, type PublicUser } from '../services/auth-session.js'

let dummyPasswordHash: Promise<string> | undefined

function getDummyPasswordHash() {
  dummyPasswordHash ??= argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id })
  return dummyPasswordHash
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function verifyPassword(password: string, passwordHash: string | undefined) {
  if (!passwordHash) {
    await getDummyPasswordHash()
    return false
  }
  try {
    return await argon2.verify(passwordHash, password)
  } catch {
    await getDummyPasswordHash()
    return false
  }
}

export const login: RequestHandler = async (request, response, next) => {
  try {
    const body: unknown = request.body
    const username = isRecord(body) && typeof body.username === 'string' ? body.username.trim() : ''
    const password = isRecord(body) && typeof body.password === 'string' ? body.password : ''
    if (!username || !password || username.length > 100 || password.length > 1024) {
      await verifyPassword(password || 'invalid', undefined)
      response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Usuário ou senha inválidos.' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, role: true, status: true, passwordHash: true },
    })
    const passwordMatches = await verifyPassword(password, user?.passwordHash)
    if (!user || user.status !== 'ACTIVE' || !passwordMatches) {
      response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Usuário ou senha inválidos.' })
      return
    }

    const publicUser: PublicUser = { id: user.id, username: user.username, email: user.email, role: user.role }
    setAuthSession(response, user.id)
    response.status(200).json({ user: publicUser })
  } catch (error) {
    next(error)
  }
}

export const getCurrentUser: RequestHandler = (_request, response) => {
  response.status(200).json({ user: response.locals.authUser })
}

export const logout: RequestHandler = (request, response) => {
  clearAuthSession(request, response)
  response.status(200).json({ message: 'Sessão encerrada.' })
}
