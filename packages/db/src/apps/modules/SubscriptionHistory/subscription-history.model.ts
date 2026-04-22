import { model, Schema } from 'mongoose'
import type { ISubscriptonHistoryDoc as ISubscriptionHistoryDoc } from './subscription-history.interface'

const SubscriptionHistorySchema = new Schema<ISubscriptionHistoryDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },

    stripeSubscriptionId: String,
    stripeCustomerId: String,

    eventType: {
      type: String,
      enum: ['CREATED', 'RENEWED', 'CANCELLED', 'FAILED_PAYMENT', 'UPDATED'],
      required: true,
    },

    status: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,

    raw: Object,
  },
  { timestamps: true }
)

export const SubscriptionHistory = model<ISubscriptionHistoryDoc>(
  'SubscriptionHistory',
  SubscriptionHistorySchema
)
