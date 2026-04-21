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
      ref: 'User',
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
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    cancelAtPeriodEnd: {
      type: Date,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
)

export const Subscription = model<ISubscriptionDoc>('Subscription', SubscriptonSchema)
