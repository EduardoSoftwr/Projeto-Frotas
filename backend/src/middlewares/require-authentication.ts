import type { RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'
import { readAuthSession, type PublicUser } from '../services/auth-session.js'

async function getAuthenticatedUser(request: Parameters<RequestHandler>[0]) {
  const session = readAuthSession(request)
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, email: true, role: true, status: true },
  })
  if (!user || user.status !== 'ACTIVE') return null

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  } satisfies PublicUser
}

export const optionalAuthentication: RequestHandler = async (request, response, next) => {
  try {
    const user = await getAuthenticatedUser(request)
    if (user) response.locals.authUser = user
    next()
  } catch (error) {
    next(error)
  }
}

export const requireAuthentication: RequestHandler = async (request, response, next) => {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      response.status(401).json({ error: 'UNAUTHENTICATED', message: 'Autenticação necessária.' })
      return
    }

    response.locals.authUser = user
    next()
  } catch (error) {
    next(error)
  }
}

export const requireAdmin: RequestHandler = (_request, response, next) => {
  const user = response.locals.authUser as PublicUser | undefined
  if (user?.role !== 'ADMIN') {
    response.status(403).json({ error: 'FORBIDDEN', message: 'Acesso não autorizado.' })
    return
  }
  next()
}
