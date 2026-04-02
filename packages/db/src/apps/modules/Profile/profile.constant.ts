// Affiliation
export const Affiliation = {
  ACTIVE_DUTY_SPOUSE: 'ACTIVE_DUTY_SPOUSE',
  ACTIVE_DUTY: 'ACTIVE_DUTY',
  VETERAN: 'VETERAN',
  MILITARY_FAMILY: 'MILITARY_FAMILY',
} as const

export const AffiliationValues = Object.values(Affiliation)

export type TAffiliation = (typeof Affiliation)[keyof typeof Affiliation]

// Kids Age Range
export const KidsAgeRange = {
  INFANT: 'INFANT',
  TODDLER: 'TODDLER',
  PRE_SCHOOL: 'PRE_SCHOOL',
  SCHOOL_AGE: 'SCHOOL_AGE',
  TEENAGER: 'TEENAGER',
} as const

export const KidsAgeRangeValues = Object.values(KidsAgeRange)

export type TKidsAgeRange = (typeof KidsAgeRange)[keyof typeof KidsAgeRange]
