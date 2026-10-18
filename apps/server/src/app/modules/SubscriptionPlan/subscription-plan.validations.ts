import {
  enumString,
  optionalEnumString,
  optionalNumber,
  optionalString,
  positiveNumber,
  requiredString,
  sortOrderValues,
} from '@repo/shared'
import { planIntervalValues } from '@repo/db'
import z from 'zod'

const createPlanSchema = z.object({
  body: z.object({
    name: requiredString('Plan Name'),
    description: optionalString('Description'),
    price: positiveNumber('Price'),
    interval: enumString(planIntervalValues, 'Interval'),
    revenueCatProductId: optionalString('RevenueCat Product ID'),
    features: z
      .array(requiredString('Feature'))
      .min(1, { message: 'Minimum one feature is required!' }),
  }),
})

const GetAllPlans = z.object({
  query: z.object({
    page: optionalString('Page'),
    limit: optionalString('Limit'),
    searchTerm: optionalString('Search Term'),
    sortBy: optionalEnumString(['createdAt', 'updatedAt', 'price'], 'Sort By'),
    sortOrder: optionalEnumString(sortOrderValues, 'Sort Order'),
    fromDate: optionalString('From Date'),
    toDate: optionalString('To Date'),
  }),
})

export const planValidations = {
  createPlanSchema,
  GetAllPlans,
}

export type TCreatePlanPayload = z.infer<typeof createPlanSchema.shape.body>
export type TGelAllPlanQuery = z.infer<typeof GetAllPlans.shape.query>
