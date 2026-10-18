// import { stripe } from '@app/configs/stripe.'
import type { TCreatePlanPayload, TGelAllPlanQuery } from './subscription-plan.validations'
import { SubscriptionPlan } from 'packages/db/src'
import slugify from 'slugify'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import type { PipelineStage } from 'mongoose'

/**
 * Create a new Subscription Plan in Local Database (Stripe commented out for RevenueCat)
 */
const createPlan = async (payload: TCreatePlanPayload) => {
  const { name, description, price, interval, features, revenueCatProductId } = payload

  const slug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  })

  // 🔴 Check duplicate
  const existingPlan = await SubscriptionPlan.findOne({ slug })
  if (existingPlan) {
    throw new AppError(httpStatus.BAD_REQUEST, `Subscription plan already exists with this name!`)
  }

  if (!Array.isArray(features) || features?.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, `You have to provide the features list!`)
  }

  // 1. Stripe Product & Price creation (Commented out - Replaced by RevenueCat):
  /*
  const stripeProduct = await stripe.products.create({
    name,
    description: description as string,
  })

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(price * 100),
    recurring: { interval: interval === 'MONTH' ? 'month' : 'year' },
    currency: 'USD',
  })
  */

  // 2. Save to DB
  const plan = await SubscriptionPlan.create({
    name,
    slug,
    description: description as string,
    price,
    interval,
    features,
    ...(revenueCatProductId ? { revenueCatProductId } : {}),
    isActive: true,
  })

  return plan
}

/**
 * Get all plans
 */
const getAllPlans = async (query: TGelAllPlanQuery) => {
  const {
    fromDate,
    toDate,
    limit = 10,
    page = 1,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'asc',
  } = query

  const pipeline: PipelineStage[] = []

  //   2. date filter:
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

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['name', 'description', 'slug'].map((field) => {
          return { [field]: { $regex: searchTerm, $options: 'i' } }
        }),
      },
    })
  }

  const skip = (Number(page) - 1) * Number(limit)

  pipeline.push({
    $facet: {
      meta: [{ $count: 'total' }],
      data: [
        { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ],
    },
  })

  const result = await SubscriptionPlan.aggregate(pipeline)

  const total = result[0]?.meta[0]?.total || 0

  return {
    data: result[0]?.data || [],
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  }
}

export const subscriptionPlanServices = {
  createPlan,
  getAllPlans,
}
