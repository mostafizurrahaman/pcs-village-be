import type { Document, Types } from 'mongoose'
import type { SubscriptionStatus } from './subscription.constant'

export type TSubscriptionStatusType = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export interface ISubscription {
  user: Types.ObjectId
  plan: Types.ObjectId
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: TSubscriptionStatusType
  currentPeriodEnd: Date
  cancelAtPeriodEnd: Date
}

export interface ISubscriptionDoc extends ISubscription, Document {}
