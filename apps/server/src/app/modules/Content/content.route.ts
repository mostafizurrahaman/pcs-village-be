import { auth } from '@app/middlewares/auth'
import type { Router } from 'express'
import express from 'express'
import { AuthRoles } from 'packages/db/src'
import { contentValidation } from './content.validations'
import { validateRequest } from '@app/middlewares'
import { ContentController } from './content.controller'

const router: Router = express.Router()

router.patch(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(contentValidation.contentSchema),
  ContentController.updateOrCreateContent
)

router.get('/', ContentController.getCotent)

export const contentRoutes = router
