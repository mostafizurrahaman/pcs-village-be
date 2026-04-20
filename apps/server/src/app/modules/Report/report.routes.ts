import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from '@repo/db'
import { reportValidations } from './report.validations'
import { validateRequest } from '@app/middlewares'
import { reportController } from './report.controller'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.USER),
  validateRequest(reportValidations.reportPost),
  reportController.reportPost
)

router.get(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(reportValidations.getAllReports),
  reportController.getAllReports
)

router.patch(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(reportValidations.resolveReport),
  reportController.resolveReport
)

export const reportRoutes = router
