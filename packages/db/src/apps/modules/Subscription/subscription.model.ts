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
      required: false,
    },
    revenueCatOriginalTransactionId: {
      type: String,
      index: true,
    },
    revenueCatAppUserId: {
      type: String,
      index: true,
    },
    revenueCatStore: {
      type: String,
    },
    revenueCatProductId: {
      type: String,
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
