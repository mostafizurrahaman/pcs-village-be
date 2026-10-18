import { auth } from '@app/middlewares/auth'
import { validateRequest } from '@app/middlewares'
import { AuthRoles } from '@repo/db'
import express, { Router } from 'express'
import { BlockControllers } from './block.controllers'
import { BlockValidations } from './block.validations'

const router: Router = express.Router()

// 1. Get my blocked users
router.get(
  '/',
  auth(AuthRoles.USER),
  validateRequest(BlockValidations.getMyBlockedUsersSchema),
  BlockControllers.getMyBlockedUsers
)

// 2. Block a user
router.post(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(BlockValidations.blockUserSchema),
  BlockControllers.blockUser
)

// 3. Unblock a user
router.delete(
  '/:id',
  auth(AuthRoles.USER),
  validateRequest(BlockValidations.unblockUserSchema),
  BlockControllers.unblockUser
)

export const blockRoutes: Router = router
