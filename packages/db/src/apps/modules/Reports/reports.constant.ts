export const reportStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const



export const reportStatusValues = Object.values(reportStatus)
