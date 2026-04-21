import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from '@repo/db'
import { notificationValidations } from './notification.validation'
import { validateRequest } from '@app/middlewares'
import { notificationControllers } from './notification.controllers'

const router: Router = express.Router()

router.patch(
  '/register-token',
  auth(AuthRoles.USER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(notificationValidations.registerToken),
  notificationControllers.registerToken
)

router.get(
  '/', // Changed from /all to / for REST standards
  auth(AuthRoles.USER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(notificationValidations.getAllNotifications),
  notificationControllers.getAllNotifications
)

router.patch('/mark-all-read', auth(AuthRoles.USER), notificationControllers.markAllAsRead)

router.patch(
  '/:id/mark-as-read',
  auth(AuthRoles.USER),
  validateRequest(notificationValidations.markAsRead),
  notificationControllers.markAsRead
)

export const notificationRoutes = router
