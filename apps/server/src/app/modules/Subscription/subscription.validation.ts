import {
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from '@repo/shared'
import z from 'zod'

const createCheckoutSession = z.object({
  body: z.object({
    planId: requiredString('Plan ID'),
  }),
})

const getAllHistory = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Searchterm'),
    sortOrder: optionalEnumString(sortOrderValues, 'Sort Order'),
    sortBy: optionalEnumString(
      [
        'planName',
        'subscriberName',
        'subscriberEmail',
        'createdAt',
        'updatedAt',
        'currentPeriodStart',
        'currentPeriodEnd',
        'status',
        'eventType',
      ],
      'Sort By'
    ),
    fromDate: optionalDate('From Date'),
    toDate: optionalDate('To Date'),
  }),
})

export const SubscriptionValidations = {
  createCheckoutSession,
  getAllHistory,
}

export type TCreateCheckoutPayload = z.infer<typeof createCheckoutSession.shape.body>
export type TGetSubscriptionHistoryQuery = z.infer<typeof getAllHistory.shape.query>
