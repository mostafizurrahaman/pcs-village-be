import { model, Schema } from 'mongoose'
import { type ISubscriptionPlanDoc } from './subscription-plan.interface'
import { PlanInterval, planIntervalValues } from './subscription-plan.constant'

const subscriptionPlanSchema = new Schema<ISubscriptionPlanDoc>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
    },
    interval: {
      type: String,
      enum: planIntervalValues,
      default: PlanInterval.MONTH,
    },
    stripePriceId: {
      type: String,
      required: true,
      unique: true,
    },
    features: {
      type: [String],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const SubscriptionPlan = model<ISubscriptionPlanDoc>(
  'SubscriptionPlan',
  subscriptionPlanSchema
)
