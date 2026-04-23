export const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  INCOMPLETE: 'incomplete',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid',
  EXPIRED: 'expired',
} as const

export const subscriptionStatusValues = Object.values(SubscriptionStatus)
