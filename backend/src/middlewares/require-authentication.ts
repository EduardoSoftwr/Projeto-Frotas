import type { RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'
import { readAuthSession, type PublicUser } from '../services/auth-session.js'

export const requireAuthentication: RequestHandler = async (request, response, next) => {
  try {
    const session = readAuthSession(request)
    if (!session) {
      response.status(401).json({ error: 'UNAUTHENTICATED', message: 'Autenticação necessária.' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, email: true, role: true, status: true },
    })
    if (!user || user.status !== 'ACTIVE') {
      response.status(401).json({ error: 'UNAUTHENTICATED', message: 'Autenticação necessária.' })
      return
    }

    const publicUser: PublicUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
    response.locals.authUser = publicUser
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
