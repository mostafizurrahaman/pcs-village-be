import type { Document, Types } from 'mongoose'
import type { historyEventType } from './subscription-history.constant'

export type TSubscriptionHistoryEventType = keyof typeof historyEventType

export interface ISubscriptionHistory {
  user: Types.ObjectId
  plan?: Types.ObjectId | undefined
  revenueCatOriginalTransactionId?: string | undefined
  status: string
  eventType: TSubscriptionHistoryEventType
  currentPeriodEnd: Date
  currentPeriodStart: Date
  raw: unknown
}

export interface ISubscriptonHistoryDoc extends ISubscriptionHistory, Document {}
