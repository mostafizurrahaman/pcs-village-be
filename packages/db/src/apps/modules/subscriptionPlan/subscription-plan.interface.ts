import type { Document } from 'mongoose'
import type { PlanInterval } from './subscription-plan.constant'

export type TPlanIntervalType = keyof typeof PlanInterval

export interface ISubscriptionPlan {
  name: string
  description: string
  slug: string
  price: number
  currency: string
  interval: TPlanIntervalType
  features: string[]
  revenueCatProductId?: string | undefined
  isActive: boolean
}

export interface ISubscriptionPlanDoc extends ISubscriptionPlan, Document {}
