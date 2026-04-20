import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'

import { AuthRoles } from 'packages/db/src'
import { notificationValidations } from './notification.validation'
import { validateRequest } from '@app/middlewares'
import { notificationControllers } from './notification.controllers'

const router: Router = express.Router()

router.patch(
  '/register-token',
  auth(AuthRoles.ADMIN, AuthRoles.CUSTOMER, AuthRoles.SUPER_ADMIN, AuthRoles.PROVIDER),
  validateRequest(notificationValidations.registerToken),
  notificationControllers.registerToken
)

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.CUSTOMER, AuthRoles.SUPER_ADMIN, AuthRoles.PROVIDER),
  validateRequest(notificationValidations.getAllNotifications),
  notificationControllers.getAllNotifications
)

router.patch(
  '/:id/mark-as-read',
  auth(AuthRoles.ADMIN, AuthRoles.CUSTOMER, AuthRoles.PROVIDER, AuthRoles.SUPER_ADMIN),
  validateRequest(notificationValidations.markAsRead),
  notificationControllers.markAsRead
)

export const notificationRoutes = router
