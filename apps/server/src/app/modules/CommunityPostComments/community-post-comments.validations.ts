// export interface ICommunityComment {
//   author: Types.ObjectId
//   post: Types.ObjectId
//   parent: Types.ObjectId
//   attachments: string[]
//   content: string
//   createdAt: Date
//   updatedAt: Date
// }

import {
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from 'packages/shared/src'
import z from 'zod'

const createComment = z.object({
  body: z.object({
    post: requiredString('Post ID'),
    parent: optionalString('Parent Comment ID').nullable(),
    content: requiredString('Content'),
  }),
})

const getCommentById = z.object({
  params: z.object({
    id: requiredString('Comment ID'),
  }),
})

const deleteCommentById = z.object({
  params: z.object({
    id: requiredString('Comment ID'),
  }),
})

const getAllCommentsByPostId = z.object({
  query: z.object({
    page: optionalNumber('Page')
      .default(1)
      .transform((num) => Number(num)),
    limit: optionalNumber('Limit')
      .transform((num) => Number(num))
      .default(10),
    sortBy: optionalEnumString(['createdAt', 'updatedAt'], 'SortBy'),
    sortOrder: optionalEnumString(sortOrderValues, 'sortOrder'),
  }),
})

export const CommunityCommentValidations = {
  createComment,
  getCommentById,
  deleteCommentById,
  getAllCommentsByPostId,
}

export type TCreateCommentPayload = z.infer<typeof createComment.shape.body>
export type TGetCommentByIDParams = z.infer<typeof getCommentById.shape.params>
export type TDeleteCommentByIDParams = z.infer<typeof deleteCommentById.shape.params>
export type TGetAllCommentsByPostQuery = z.infer<typeof getAllCommentsByPostId.shape.query>
