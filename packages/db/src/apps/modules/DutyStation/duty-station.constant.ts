const DutyStations = {
  OFFICE: 'OFFICE',
  FIELD: 'FIELD',
  REMOTE: 'REMOTE',
  BASE: 'BASE',
} as const

export const DutyStationTypeValues = Object.values(DutyStations)
export type DutyStationType = (typeof DutyStations)[keyof typeof DutyStations]
