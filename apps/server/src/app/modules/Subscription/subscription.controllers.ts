import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { SubscriptionServices } from './subscripton.services'

const initiateCheckout = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const { planId } = req.body

  const url = await SubscriptionServices.createCheckoutSession(user, planId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Checkout URL generated successfully',
    data: url,
  })
})

const getMySubscription = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await SubscriptionServices.getMySubscription(user._id.toString())

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription status retrieved',
    data: result,
  })
})

const stripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  const result = await SubscriptionServices.handleWebhook(sig, req.body)
  res.status(200).send(result)
})

export const SubscriptionControllers = {
  initiateCheckout,
  getMySubscription,
  stripeWebhook,
}
