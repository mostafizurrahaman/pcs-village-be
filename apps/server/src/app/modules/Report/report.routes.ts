import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { reportValidations } from './report.validations'
import { validateRequest } from '@app/middlewares'
import { AuthController } from '../Auth/user.controllers'
import { reportController } from './report.controller'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.USER),
  validateRequest(reportValidations.reportPost),
  reportController.reportPost
)

export const reportRoutes = router
