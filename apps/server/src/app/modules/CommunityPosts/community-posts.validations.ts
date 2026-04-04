import { communityPostSortableFields } from 'packages/db/src'

import {
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from '@repo/shared'
import z from 'zod'

const createCommunityPost = z.object({
  body: z.object({
    content: requiredString('Content'),
  }),
})

const updateCommunityPost = z.object({
  body: z.object({
    content: requiredString('Content'),
  }),
  params: z.object({
    id: requiredString('Post ID'),
  }),
})

const getCommunityPostById = z.object({
  params: z.object({
    id: requiredString('Post ID'),
  }),
})

const deleteCommunityPostById = z.object({
  params: z.object({
    id: requiredString('Post ID'),
  }),
})

const deleteCommunityPostAttachmentById = z.object({
  params: z.object({
    id: requiredString('Post ID'),
  }),
  body: z.object({
    url: requiredString('URL'),
  }),
})

const getUserCommunityPost = z.object({
  query: z.object({
    page: optionalNumber('Page').default(1),
    limit: optionalNumber('Limit').default(10),
    searchTerm: optionalString('Searchterm'),
    sortBy: optionalEnumString(communityPostSortableFields, 'SortBy'),
    sortOrder: optionalEnumString(sortOrderValues, 'sortOrder'),
    fromDate: optionalDate('fromDate'),
    toDate: optionalDate('toDate'),
  }),
})

export const communityPostValidations = {
  createCommunityPost,
  updateCommunityPost,
  getCommunityPostById,
  deleteCommunityPostById,
  deleteCommunityPostAttachmentById,
  getUserCommunityPost,
}

// 1. Create Community Payload interfaces :
export type TCreateCommunityPayload = z.infer<typeof createCommunityPost.shape.body>

// 2. Update Community Payload and params:
export type TUpdateCommunityPayload = z.infer<typeof updateCommunityPost.shape.body>
export type TUpdateCommunityParmas = z.infer<typeof updateCommunityPost.shape.params>
export type TGetUserCommunityPostQuery = z.infer<typeof getUserCommunityPost.shape.query>
