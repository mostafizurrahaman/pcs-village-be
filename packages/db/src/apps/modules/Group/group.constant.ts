export const GroupType = {
  ARRIVAL: 'ARRIVAL',
  NEWCOMER: 'NEWCOMER',
  CLASSIFIED: 'CLASSIFIED',
} as const

export const GroupTabs = {
  SUGGESTED: 'SUGGESTED',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
}

export const groupTypeValues = Object.values(GroupType)
export const groupTabValues = Object.values(GroupTabs)
