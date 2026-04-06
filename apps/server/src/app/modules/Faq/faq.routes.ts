import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { faqValidation } from './faq.validations'
import { FaqController } from './faq.controller'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(faqValidation.createFaqSchema),
  FaqController.createFaq
)

router.get('/', validateRequest(faqValidation.getAllFaqSchema), FaqController.getAllFaq)

router.get('/:id', FaqController.getSingleFaq)

router.patch(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(faqValidation.updateFaqSchema),
  FaqController.updateFaq
)

router.delete('/:id', auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN), FaqController.deleteFaq)

export const faqRoutes = router
