import Stripe from 'stripe'
import configs from '@app/configs'
import {
  SubscriptionPlan,
  Conversation,
  Subscription,
  type IUser,
  SubscriptionStatus,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { logger } from '@app/libs/logger'
import {
  handleCheckSession,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSuccedded,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from './subscription.utils'

const stripe = new Stripe(configs.stripe.secretKey as string, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: '2025-01-27.acacia' as any,
})

/**
 * 1. Create Stripe Checkout Session
 */
const createCheckoutSession = async (user: IUser, planId: string) => {
  //   1. Check is the plan exists:
  const plan = await SubscriptionPlan.findById(planId)
  if (!plan) {
    throw new AppError(httpStatus.NOT_FOUND, 'Plan not found')
  }

  //   2. Check is there any active subscription :
  const activeSubscription = await Subscription.findOne({
    user: user?._id,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodEnd: {
      $gt: new Date(),
    },
  })

  if (activeSubscription) {
    throw new AppError(httpStatus.BAD_REQUEST, `You have already an subscripton!`)
  }

  //   2. Cancelled but still have previous subscription validity:
  const pendingCancellation = Subscription.findOne({
    user: user?._id,
    status: SubscriptionStatus.CANCELLED,
    cancelAtPeriodEnd: true,
    currentPeriodEnd: {
      $gt: new Date(),
    },
  })

  if (!pendingCancellation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Subscription is already active until cancellation period ends!`
    )
  }

  //  1. Check is there any active subscription? :
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: user.email,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${configs.stripe.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: configs.stripe.cancelUrl,
    metadata: {
      userId: user?._id.toString(),
      planId: plan._id.toString(),
    },
  })

  return session.url
}

/**
 * 2. Handle Stripe Webhook (Atomic DB Update)
 */
const handleWebhook = async (sig: string, rawBody: Buffer) => {
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, configs.stripe.webhookKey as string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new AppError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`)
  }

  logger.info('EVENT_TYPE', event.type)

  // Use switch for cleaner control flow
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckSession(event)
      break

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSuccedded(event)
      break

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event)
      break

    default:
      logger.warn(`Unhandled event type: ${event.type}`)
  }

  return { received: true }
}

/**
 * 3. Gatekeeper: Check if user can start a conversation
 */
const checkMessagingAccess = async (userId: string) => {
  const sub = await Subscription.findOne({
    user: userId,
    status: {
      $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
    },
    currentPeriodEnd: { $gt: new Date() },
  })

  // If Premium, let them through
  if (sub) return true

  // If Free, check if they started more than 2 conversations
  const count = await Conversation.countDocuments({ initiator: userId })
  if (count >= 2) {
    throw new AppError(httpStatus.FORBIDDEN, 'Please update your subscription plan.')
  }

  return true
}

const getMySubscription = async (userId: string) => {
  return await Subscription.findOne({ user: userId }).populate('plan')
}

export const SubscriptionServices = {
  createCheckoutSession,
  handleWebhook,
  checkMessagingAccess,
  getMySubscription,
}
