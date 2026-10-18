import configs from '@app/configs'
import {
  SubscriptionPlan,
  Conversation,
  Subscription,
  type IUser,
  SubscriptionStatus,
  AuthRoles,
  SubscriptionHistory,
  User,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { logger } from '@app/libs/logger'
import { Types, type PipelineStage } from 'mongoose'
import type { TGetSubscriptionHistoryQuery } from './subscription.validation'
import type { TSubscriptionStatusType } from 'packages/db/src/apps/modules/Subscription/subscription.interface'

// ==================== STRIPE SUBSCRIPTION (COMMENTED OUT) ====================
// import Stripe from 'stripe'
// import {
//   handleCheckSession,
//   handleInvoicePaymentFailed,
//   handleInvoicePaymentSuccedded,
//   handleSubscriptionDeleted,
//   handleSubscriptionUpdated,
// } from './subscription.utils'
//
// const stripe = new Stripe(configs.stripe.secretKey as string, {
//   apiVersion: '2025-01-27.acacia' as any,
// })
//
// const createCheckoutSession = async (user: IUser, planId: string) => {
//   const plan = await SubscriptionPlan.findById(planId)
//   if (!plan) {
//     throw new AppError(httpStatus.NOT_FOUND, 'Plan not found')
//   }
//   const activeSubscription = await Subscription.findOne({
//     user: user?._id,
//     status: SubscriptionStatus.ACTIVE,
//     currentPeriodEnd: { $gt: new Date() },
//   })
//   if (activeSubscription) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'You have already a subscription!')
//   }
//   const session = await stripe.checkout.sessions.create({
//     payment_method_types: ['card'],
//     mode: 'subscription',
//     customer_email: user.email,
//     line_items: [{ price: plan.stripePriceId, quantity: 1 }],
//     success_url: `${configs.stripe.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
//     cancel_url: configs.stripe.cancelUrl,
//     metadata: {
//       userId: user?._id.toString(),
//       planId: plan._id.toString(),
//     },
//   })
//   return session.url
// }
//
// const handleWebhook = async (sig: string, rawBody: Buffer) => {
//   let event: Stripe.Event
//   try {
//     event = stripe.webhooks.constructEvent(rawBody, sig, configs.stripe.webhookKey as string)
//   } catch (err: any) {
//     throw new AppError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`)
//   }
//   switch (event.type) {
//     case 'checkout.session.completed':
//       await handleCheckSession(event)
//       break
//     case 'invoice.payment_succeeded':
//       await handleInvoicePaymentSuccedded(event)
//       break
//     case 'invoice.payment_failed':
//       await handleInvoicePaymentFailed(event)
//       break
//     case 'customer.subscription.updated':
//       await handleSubscriptionUpdated(event)
//       break
//     case 'customer.subscription.deleted':
//       await handleSubscriptionDeleted(event)
//       break
//   }
//   return { received: true }
// }
// ==============================================================================

export interface IRevenueCatWebhookEvent {
  id: string
  type: string
  app_user_id: string
  original_app_user_id?: string
  aliases?: string[]
  product_id: string
  entitlement_id?: string
  entitlement_ids?: string[]
  period_type?: string
  purchased_at_ms: number
  grace_period_expires_date_ms?: number | null
  expiration_at_ms?: number | null
  auto_resume_at_ms?: number | null
  store?: string
  environment?: string
  is_trial_conversion?: boolean
  cancel_reason?: string | null
  new_product_id?: string | null
  price?: number
  currency?: string
  transaction_id?: string
  original_transaction_id?: string
}

export interface IRevenueCatWebhookBody {
  api_version?: string
  event: IRevenueCatWebhookEvent
}

/**
 * Handle RevenueCat Webhook (Server-to-Server)
 */
const handleRevenueCatWebhook = async (
  authHeader: string | undefined,
  body: IRevenueCatWebhookBody
) => {
  // 1. Authenticate webhook if secret is configured
  if (configs.revenueCat.webhookSecret) {
    const expectedToken = configs.revenueCat.webhookSecret
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader?.trim()

    if (token !== expectedToken) {
      logger.warn('[RevenueCat Webhook] Unauthorized attempt with invalid token')
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid webhook authorization token')
    }
  }

  const { event } = body
  if (!event || !event.type) {
    logger.warn('[RevenueCat Webhook] Received payload without event object')
    return { received: true, message: 'No event to process' }
  }

  logger.info(
    `[RevenueCat Webhook] Processing event: ${event.type} for app_user_id: ${event.app_user_id}`
  )

  // Respond immediately to test events
  if (event.type === 'TEST') {
    return { received: true, test: true }
  }

  // 2. Resolve User
  const appUserId = event.app_user_id || event.original_app_user_id
  let user: IUser | null = null

  if (appUserId && Types.ObjectId.isValid(appUserId)) {
    user = await User.findById(appUserId)
  }

  if (!user && appUserId) {
    user = await User.findOne({ email: appUserId.toLowerCase().trim() })
  }

  // Check aliases
  if (!user && event.aliases && event.aliases.length > 0) {
    for (const alias of event.aliases) {
      if (Types.ObjectId.isValid(alias)) {
        user = await User.findById(alias)
        if (user) break
      } else if (alias.includes('@')) {
        user = await User.findOne({ email: alias.toLowerCase().trim() })
        if (user) break
      }
    }
  }

  // Fallback to existing subscription record with same original_transaction_id
  if (!user && event.original_transaction_id) {
    const existingSub = await Subscription.findOne({
      revenueCatOriginalTransactionId: event.original_transaction_id,
    })
    if (existingSub) {
      user = await User.findById(existingSub.user)
    }
  }

  if (!user) {
    logger.warn(`[RevenueCat Webhook] User not found for app_user_id: ${appUserId}`)
    return { received: true, warning: 'User not found' }
  }

  // 3. Resolve Plan
  let plan = null
  const productId = event.new_product_id || event.product_id
  if (productId) {
    plan = await SubscriptionPlan.findOne({
      $or: [
        { revenueCatProductId: productId },
        { slug: productId },
        { name: productId },
      ],
    })
  }

  // 4. Period Start & End Dates
  const currentPeriodStart = event.purchased_at_ms
    ? new Date(event.purchased_at_ms)
    : new Date()
  const currentPeriodEnd = event.expiration_at_ms
    ? new Date(event.expiration_at_ms)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // 5. Map Event Type to Subscription Status
  let status: TSubscriptionStatusType = SubscriptionStatus.ACTIVE
  let cancelAtPeriodEnd = false
  let historyEvent = 'UPDATED'

  switch (event.type) {
    case 'INITIAL_PURCHASE':
      status = SubscriptionStatus.ACTIVE
      cancelAtPeriodEnd = false
      historyEvent = 'CREATED'
      break

    case 'RENEWAL':
      status = SubscriptionStatus.ACTIVE
      cancelAtPeriodEnd = false
      historyEvent = 'RENEWED'
      break

    case 'PRODUCT_CHANGE':
    case 'NON_RENEWING_PURCHASE':
    case 'UNCANCELLATION':
      status = SubscriptionStatus.ACTIVE
      cancelAtPeriodEnd = false
      historyEvent = 'UPDATED'
      break

    case 'CANCELLATION':
      cancelAtPeriodEnd = true
      historyEvent = 'CANCELLED'
      if (event.expiration_at_ms && event.expiration_at_ms < Date.now()) {
        status = SubscriptionStatus.CANCELLED
      } else {
        status = SubscriptionStatus.ACTIVE
      }
      break

    case 'EXPIRATION':
      status = SubscriptionStatus.EXPIRED
      cancelAtPeriodEnd = true
      historyEvent = 'UPDATED'
      break

    case 'BILLING_ISSUE':
      status = SubscriptionStatus.PAST_DUE
      historyEvent = 'FAILED_PAYMENT'
      break

    default:
      logger.info(`[RevenueCat Webhook] Unhandled event: ${event.type}`)
      status = SubscriptionStatus.ACTIVE
      historyEvent = 'UPDATED'
  }

  // 6. Upsert Subscription
  const filter = event.original_transaction_id
    ? {
        $or: [
          { user: user._id },
          { revenueCatOriginalTransactionId: event.original_transaction_id },
        ],
      }
    : { user: user._id }

  const sub = await Subscription.findOneAndUpdate(
    filter,
    {
      $set: {
        user: user._id,
        ...(plan ? { plan: plan._id } : {}),
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        revenueCatOriginalTransactionId: event.original_transaction_id,
        revenueCatAppUserId: event.app_user_id,
        revenueCatStore: event.store,
        revenueCatProductId: event.product_id,
      },
    },
    { new: true, upsert: true }
  )

  // 7. Record Subscription History
  await SubscriptionHistory.create({
    user: user._id,
    ...(plan ? { plan: plan._id } : {}),
    ...(event.original_transaction_id
      ? { revenueCatOriginalTransactionId: event.original_transaction_id }
      : {}),
    eventType: historyEvent,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    raw: event,
  })

  logger.info(
    `[RevenueCat Webhook] Subscription updated for user ${user._id} to ${status}`
  )

  return { received: true, status, subscriptionId: sub._id }
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
        revenueCatOriginalTransactionId: '$revenueCatOriginalTransactionId',
        revenueCatAppUserId: '$revenueCatAppUserId',
        revenueCatStore: '$revenueCatStore',
        revenueCatProductId: '$revenueCatProductId',
        currentPeriodStart: '$currentPeriodStart',
        currentPeriodEnd: '$currentPeriodEnd',
        cancelAtPeriodEnd: '$cancelAtPeriodEnd',
        status: '$status',
        planName: '$plan.name',
        planId: '$plan._id',
        planSlug: '$plan.slug',
        planPrice: '$plan.price',
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
      revenueCatOriginalTransactionId: '$revenueCatOriginalTransactionId',
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
      'revenueCatOriginalTransactionId',
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
  // createCheckoutSession,
  // handleWebhook,
  handleRevenueCatWebhook,
  checkMessagingAccess,
  getMySubscription,
  getSubscriptionHistory,
}
