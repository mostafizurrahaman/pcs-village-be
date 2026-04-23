import { stripe } from '@app/configs/stripe.'
import { logger } from '@app/libs/logger'
import { Types } from 'mongoose'
import {
  historyEventType,
  Subscription,
  SubscriptionHistory,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@repo/db'
import type Stripe from 'stripe'
// 1. Checkout session.completed
export const handleCheckSession = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session

  logger.info('Checkout session object', event.data.object)

  // 1. Extract data from metadata:
  const userId = session?.metadata?.userId as string
  const planId = session?.metadata?.planId

  // 2. Retrived subscription from stripe:
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  // 3. Retrived plan from db:
  const plan = await SubscriptionPlan.findById(planId)
  if (!plan) {
    return { message: "Plan doesn't exists" }
  }

  // Subscription payload:
  const subData = {
    user: new Types.ObjectId(userId),
    plan: plan?._id as Types.ObjectId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date(
      (subscription?.items?.data?.[0]?.current_period_start as number) * 1000
    ),
    currentPeriodEnd: new Date(
      (subscription?.items?.data?.[0]?.current_period_end as number) * 1000
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }

  // 4. Create new subscription :
  await Subscription.findOneAndUpdate(
    {
      stripeSubscriptionId: subscription.id,
    },
    {
      $set: subData,
    },
    {
      upsert: true,
      new: true,
    }
  )

  // 5. Check is subscripton history exists already:
  const hasSubscriptonHistory = SubscriptionHistory.findOne({
    stripeSubscriptionId: subscription.id,
    eventType: historyEventType.CREATED,
  })

  if (!hasSubscriptonHistory) {
    // 6. Create subscription history:
    await SubscriptionHistory.create({
      user: new Types.ObjectId(userId),
      plan: plan?._id as Types.ObjectId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      eventType: historyEventType.CREATED,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(
        (subscription?.items?.data?.[0]?.current_period_start as number) * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription?.items?.data?.[0]?.current_period_end as number) * 1000
      ),

      raw: event,
    })
  }
}

// 2. Invoice Payment Succedded:
export const handleInvoicePaymentSuccedded = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice

  // 1. Get the subscription id:
  const subscriptionId = invoice.parent?.subscription_details?.subscription as string

  // 2. Retrived subscription from stripe:
  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)

  // 3. Retrive the subscription from db:
  const sub = await Subscription.findOneAndUpdate(
    {
      stripeSubscriptionId: subscription.id,
    },
    {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(
        (subscription?.items?.data?.[0]?.current_period_start as number) * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription?.items?.data?.[0]?.current_period_end as number) * 1000
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    {
      new: true,
    }
  )

  // 3. If subscription exists update the history:
  if (sub) {
    await SubscriptionHistory.create({
      user: sub.user,
      plan: sub.plan,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: sub.stripeCustomerId,
      eventType: historyEventType.RENEWED,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(
        (subscription?.items?.data?.[0]?.current_period_start as number) * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription?.items?.data?.[0]?.current_period_end as number) * 1000
      ),
      raw: event,
    })
  }
}

// 3. Invoice Payment Failed:

export const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice

  // 1. Get the subscription id:
  const subscriptionId = invoice.parent?.subscription_details?.subscription as string

  // 2. Retrived subscription from stripe:
  const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)

  const sub = await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: SubscriptionStatus.PAST_DUE,
    },
    { new: true }
  )

  if (sub) {
    await SubscriptionHistory.create({
      user: sub.user,
      plan: sub.plan,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: sub.stripeCustomerId,
      eventType: historyEventType.FAILED_PAYMENT,
      status: SubscriptionStatus.PAST_DUE,
      raw: event,
    })
  }
}

// 4. Subscription update Event:

export const handleSubscriptionUpdated = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription

  const sub = await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: subscription.cancel_at_period_end
        ? SubscriptionStatus.CANCELLED
        : SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodStart: new Date(
        (subscription?.items?.data?.[0]?.current_period_start as number) * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription?.items?.data?.[0]?.current_period_end as number) * 1000
      ),
    },
    { new: true }
  )

  if (sub) {
    await SubscriptionHistory.create({
      user: sub.user,
      plan: sub.plan,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: sub.stripeCustomerId,
      eventType: historyEventType.UPDATED,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      raw: event,
    })
  }
}

export const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription

  const sub = await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: SubscriptionStatus.CANCELLED,
    },
    { new: true }
  )

  if (sub) {
    await SubscriptionHistory.create({
      user: sub.user,
      plan: sub.plan,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: sub.stripeCustomerId,
      eventType: historyEventType.CANCELLED,
      status: SubscriptionStatus.CANCELLED,
      raw: event,
    })
  }
}
