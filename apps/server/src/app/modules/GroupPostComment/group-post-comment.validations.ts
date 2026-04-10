import {
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from '@repo/shared'
import z from 'zod'

const createComment = z.object({
  body: z.object({
    post: requiredString('Post ID'),
    parent: optionalString('Parent Comment ID').nullable(),
    content: requiredString('Content'),
  }),
})

const getAllCommentsByPostId = z.object({
  query: z.object({
    page: optionalNumber('Page').default(1),
    limit: optionalNumber('Limit').default(10),
    sortBy: optionalString('SortBy').default('createdAt'),
    sortOrder: optionalEnumString(sortOrderValues, 'sortOrder'),
  }),
})

export const GroupCommentValidations = {
  createComment,
  getAllCommentsByPostId,
}

export type TCreateGroupCommentPayload = z.infer<typeof createComment.shape.body>
export type TGetAllCommentsByPostIdQuery = z.infer<typeof getAllCommentsByPostId.shape.query>
