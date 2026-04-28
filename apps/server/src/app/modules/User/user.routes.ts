import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { auth } from '@app/middlewares/auth'
import { validateRequest } from '@app/middlewares'
import { UserValidations } from './user.validations'
import { userControllers } from './user.controllers'

const router: Router = express.Router()

// Get all users
router.get(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(UserValidations.getAllUserSchema),
  userControllers.getAllUser
)

router.get(
  '/stats',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  // validateRequest(UserValidations.getSingleUserSchema),
  userControllers.getDashboardStats
)

// Get single user by ID
router.get(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(UserValidations.getSingleUserSchema),
  userControllers.getSingleUser
)

// Get single user by ID
router.delete(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN, AuthRoles.USER),
  validateRequest(UserValidations.getSingleUserSchema),
  userControllers.deleteUserById
)

export const UserRoutes = router
 