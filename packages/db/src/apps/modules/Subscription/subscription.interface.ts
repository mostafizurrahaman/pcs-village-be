import type { Document, Types } from 'mongoose'
import type { SubscriptionStatus } from './subscription.constant'

export type TSubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export interface ISubscription {
  user: Types.ObjectId
  plan?: Types.ObjectId | undefined
  revenueCatOriginalTransactionId?: string | undefined
  revenueCatAppUserId?: string | undefined
  revenueCatStore?: string | undefined
  revenueCatProductId?: string | undefined
  status: TSubscriptionStatusType
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: Boolean
}

export interface ISubscriptionDoc extends ISubscription, Document {}
