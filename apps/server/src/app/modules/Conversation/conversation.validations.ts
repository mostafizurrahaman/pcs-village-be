import {
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  sortOrderValues,
} from 'packages/shared/src'
import z from 'zod'

const getAllConversations = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Searchterm'),
    sortOrder: optionalEnumString(sortOrderValues, 'Sort order'),
    sortBy: optionalEnumString(['createdAt', 'updatedAt', 'oponentName', 'oponentEmail'], 'SortBy'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const conversationValidations = {
  getAllConversations,
}

export type TGetAllConversationQueryType = z.infer<typeof getAllConversations.shape.query>
