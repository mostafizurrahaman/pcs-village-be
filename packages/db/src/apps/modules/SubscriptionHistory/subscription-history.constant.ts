export const historyEventType = {
  CREATED: 'CREATED',
  RENEWED: 'RENEWED',
  CANCELLED: 'CANCELLED',
  FAILED_PAYMENT: 'FAILED_PAYMENT',
  UPDATED: 'UPDATED',
} as const




export const historyEventValues = Object.values(historyEventType)

