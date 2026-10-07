import { Router } from 'express'
import { getCurrentUser, login, logout } from '../controllers/auth.controller.js'
import { requireAuthentication } from '../middlewares/require-authentication.js'

export const authRouter = Router()

authRouter.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  next()
})

authRouter.post('/login', login)
authRouter.get('/me', requireAuthentication, getCurrentUser)
authRouter.post('/logout', logout)
