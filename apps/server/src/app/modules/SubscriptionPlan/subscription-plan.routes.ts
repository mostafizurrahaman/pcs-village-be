import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { planValidations } from './subscription-plan.validations'
import { subscriptionPlanController } from './subscriptoin-plan.controllers'

const router: Router = express.Router()

// 1.  Subscription plan :
router.post(
  '/',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(planValidations.createPlanSchema),
  subscriptionPlanController.createSubscriptionPlan
)

router.get(
  '/',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN, AuthRoles.USER),
  validateRequest(planValidations.GetAllPlans),
  subscriptionPlanController.getAllPlans
)

export const subscriptionPlanRoutes = router
