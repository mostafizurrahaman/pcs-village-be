export const baseRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

// 1. Values;
export const baseRequestStatusValues = Object.values(baseRequestStatus)
