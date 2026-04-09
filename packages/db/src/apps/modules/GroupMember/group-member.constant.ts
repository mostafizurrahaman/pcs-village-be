export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  LEFT: 'LEFT',
} as const

export const membershipValues = Object.values(MembershipStatus)

export type TMembershipStatus = keyof typeof MembershipStatus
