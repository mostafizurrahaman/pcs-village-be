import { groupTabValues } from 'packages/db/src'
import {
  enumString,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from 'packages/shared/src'
import z from 'zod'

const joinGroup = z.object({
  params: z.object({
    id: requiredString('Group ID'),
  }),
})

const getUserAllGroups = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('SearchTerm'),
    tab: enumString(groupTabValues, 'Tab'),
    sortBy: optionalEnumString(
      [
        'groupName',
        'stationName',
        'stationCountry',
        'stationCity',
        'stationState',
        'stationType',
        'createdAt',
        'updatedAt',
      ],
      'Sort By'
    ),
    sortOrder: optionalEnumString(sortOrderValues, 'Sort Order'),
  }),
})

export const groupValidations = {
  joinGroup,
  getUserAllGroups,
}

export type TJoinGroup = z.infer<typeof joinGroup.shape.params>
export type TGetUserAllGroupQuery = z.infer<typeof getUserAllGroups.shape.query>
