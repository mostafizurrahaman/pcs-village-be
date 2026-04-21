export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid',
  EXPIRED: 'expired',
} as const

export const subscriptionStatusValues = Object.values(SubscriptionStatus)
