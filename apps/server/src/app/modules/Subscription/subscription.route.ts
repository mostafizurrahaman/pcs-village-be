import { Router } from 'express'
import {  validateRequest } from '@app/middlewares'
import { AuthRoles } from '@repo/db'
import { SubscriptionValidations } from './subscription.validation'
import { SubscriptionControllers } from './subscription.controllers'
import { auth } from '@app/middlewares/auth'

const router: Router = Router()

router.get('/my-subscription', auth(AuthRoles.USER), SubscriptionControllers.getMySubscription)

router.post(
  '/checkout',
  auth(AuthRoles.USER),
  validateRequest(SubscriptionValidations.createCheckoutSession),
  SubscriptionControllers.initiateCheckout
)

export const subscriptionRoutes = router
