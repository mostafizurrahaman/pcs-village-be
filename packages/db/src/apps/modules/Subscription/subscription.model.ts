import { model, Schema } from 'mongoose'
import type { ISubscriptionDoc } from './subscription.interface'
import { subscriptionStatusValues } from './subscription.constant'

const SubscriptonSchema = new Schema<ISubscriptionDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: subscriptionStatusValues,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
)

export const Subscription = model<ISubscriptionDoc>('Subscription', SubscriptonSchema)
