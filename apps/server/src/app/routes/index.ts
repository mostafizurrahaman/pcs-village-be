import { authRoutes } from '@app/modules/Auth/user.routes'
import express, { Router } from 'express'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
