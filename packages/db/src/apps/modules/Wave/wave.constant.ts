export const WaveStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const

export const waveStatusValues = Object.values(WaveStatus)
