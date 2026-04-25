import Stripe from 'stripe'
import configs from '@app/configs'
import {
  SubscriptionPlan,
  Conversation,
  Subscription,
  type IUser,
  SubscriptionStatus,
  AuthRoles,
  SubscriptionHistory,
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
import type { PipelineStage } from 'mongoose'
import type { TGetSubscriptionHistoryQuery } from './subscription.validation'

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
  if (!sub) {
    throw new AppError(httpStatus.PAYMENT_REQUIRED, 'Please update your subscription plan!')
  }

  return true
}

const getMySubscription = async (user: IUser) => {
  const sub = await Subscription.aggregate([
    {
      $match: {
        user: user?._id,
        status: {
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
        },
        currentPeriodEnd: {
          $gt: new Date(),
        },
      },
    },
    {
      $lookup: {
        from: 'subscriptionplans',
        localField: 'plan',
        foreignField: '_id',
        as: 'plan',
      },
    },
    {
      $unwind: {
        path: '$plan',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        user: '$user',
        stripeSubscriptionId: '$stripeSubscriptionId',
        stripePriceId: '$stripePriceId',
        currentPeriodStart: '$currentPeriodStart',
        currentPeriodEnd: '$currentPeriodEnd',
        cancelAtPeriodEnd: '$cancelAtPeriodEnd',
        stripeCustomerId: '$stripeCustomerId',
        status: '$status',
        planName: '$plan.name',
        planId: '$plan._id',
        planSlug: '$plan.slug',
        planCurrency: '$plan.currency',
        planInterval: '$plan.interval',
        features: '$plan.features',
      },
    },
  ])

  return sub[0]
}

// How can i retrived subscription history:
const getSubscriptionHistory = async (user: IUser, query: TGetSubscriptionHistoryQuery) => {
  const {
    page,
    limit,
    fromDate,
    toDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    searchTerm,
  } = query

  const pipeline: PipelineStage[] = []

  // 1. Based on user role :
  if (user?.role === AuthRoles.USER) {
    pipeline.push({
      $match: {
        user: user?._id,
      },
    })
  }

  // 2. subscriber Info:
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'subscriber',
      },
    },
    {
      $lookup: {
        from: 'subscriptionplans',
        localField: 'plan',
        foreignField: '_id',
        as: 'plan',
      },
    },
    {
      $unwind: {
        path: '$subscriber',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$plan',
        preserveNullAndEmptyArrays: true,
      },
    }
  )

  // 3. Final  projections:
  pipeline.push({
    $project: {
      subscriberId: '$subscriber._id',
      subscriberName: '$subscriber.name',
      subscriberEmail: '$subscriber.email',
      subscriberProfileImage: '$subscriber?.profileImage',
      stripeCustomerId: '$stripeCustomerId',
      stripeSubscriptionId: '$stripeSubscriptionId',
      stripePriceId: '$plan.stripePriceId',
      status: '$status',
      eventType: '$eventType',
      planId: '$plan._id',
      planName: '$plan.name',
      planSlug: '$plan.slug',
      planPrice: '$plan.price',
      planInterval: '$plan.interval',
      currentPeriodStart: '$currentPeriodStart',
      currentPeriodEnd: '$currentPeriodEnd',
      updatedAt: '$updatedAt',
      createdAt: '$createdAt',
    },
  })

  // 4. Date filter:
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}

    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }

    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }

    pipeline.push({
      $match: {
        createdAt: dateFilter,
      },
    })
  }

  // searchable fields :
  if (searchTerm) {
    const searchableFields = [
      'planName',
      'subscriberEmail',
      'subscriberName',
      'stripeCustomerId',
      'stripePriceId',
    ]
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => {
          return {
            [field]: {
              $regex: searchTerm,
              $options: 'i',
            },
          }
        }),
      },
    })
  }

  // Sorting
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    },
  })

  // Limit && Pagination :
  const dataPage = Number(page) || 1
  const dataLimit = Number(limit) || 10
  const skip = (dataPage - 1) * dataLimit

  pipeline.push({
    $facet: {
      data: [
        {
          $skip: skip,
        },
        {
          $limit: dataLimit,
        },
      ],
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  const histories = await SubscriptionHistory.aggregate(pipeline)

  const data = histories?.[0].data
  const total = histories?.[0]?.meta?.[0]?.total || 0
  const totalPages = Math.ceil(total / dataLimit)

  return {
    data,
    meta: {
      page: dataPage,
      limit: dataLimit,
      total,
      totalPages,
    },
  }
}

export const SubscriptionServices = {
  createCheckoutSession,
  handleWebhook,
  checkMessagingAccess,
  getMySubscription,
  getSubscriptionHistory,
}
