import { communityPostSortableFields } from 'packages/db/src'
import {
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from 'packages/shared/src'
import z from 'zod'

const createPost = z.object({
  body: z.object({
    group: requiredString('Group ID'),
    content: requiredString('Content'),
  }),
})

const deleteGroupPostAttachmentById = z.object({
  params: z.object({
    id: requiredString('Post ID'),
  }),
  body: z.object({
    url: requiredString('URL'),
  }),
})

const updateGroupPost = z.object({
  body: z.object({
    content: requiredString('Content'),
  }),
  params: z.object({
    id: requiredString('Post ID'),
  }),
})

const getPostById = z.object({
  params: z.object({
    id: requiredString('Post ID'),
  }),
})

const getAllGroupPosts = z.object({
  query: z.object({
    group: requiredString('Group ID'),
    page: optionalNumber('Page').default(1),
    limit: optionalNumber('Limit').default(10),
    searchTerm: optionalString('Searchterm'),
    sortBy: optionalEnumString(['authorName', 'authorEmail', 'content', 'createdAt'], 'SortBy'),
    sortOrder: optionalEnumString(sortOrderValues, 'sortOrder'),
    fromDate: optionalDate('fromDate'),
    toDate: optionalDate('toDate'),
  }),
})

export const groupPostValidations = {
  createPost,
  deleteGroupPostAttachmentById,
  updateGroupPost,
  getPostById,
  getAllGroupPosts,
}

export type TCreateGroupPost = z.infer<typeof createPost.shape.body>
export type TUpdateGroupPost = z.infer<typeof updateGroupPost.shape.body>
export type TGetAllGroupPostsQuery = z.infer<typeof getAllGroupPosts.shape.query>
