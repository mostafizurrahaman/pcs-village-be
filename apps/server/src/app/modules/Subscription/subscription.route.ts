import { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { AuthRoles } from '@repo/db'
import { SubscriptionValidations } from './subscription.validation'
import { SubscriptionControllers } from './subscription.controllers'
import { auth } from '@app/middlewares/auth'

const router: Router = Router()

router.get('/my-subscription', auth(AuthRoles.USER), SubscriptionControllers.getMySubscription)

// Stripe checkout (Commented out for RevenueCat):
// router.post(
//   '/checkout',
//   auth(AuthRoles.USER),
//   validateRequest(SubscriptionValidations.createCheckoutSession),
//   SubscriptionControllers.initiateCheckout
// )

router.get(
  '/histories',
  auth(AuthRoles.USER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(SubscriptionValidations.getAllHistory),
  SubscriptionControllers.getSubscriptionHistory
)

// RevenueCat Webhook:
router.post('/revenuecat-webhook', SubscriptionControllers.revenueCatWebhook)
router.post('/webhook', SubscriptionControllers.revenueCatWebhook)

export const subscriptionRoutes = router
