import { authRoutes } from '@app/modules/Auth/user.routes'
import { branchRoutes } from '@app/modules/Branch/branch.route'
import { DutyStationRoutes } from '@app/modules/DutyStation/duty-station.routes'
import express, { Router } from 'express'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/branches',
    route: branchRoutes,
  },
   {
    path: '/dutystations',
    route: DutyStationRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
