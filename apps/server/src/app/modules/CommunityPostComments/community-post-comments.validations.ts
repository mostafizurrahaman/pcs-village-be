// export interface ICommunityComment {
//   author: Types.ObjectId
//   post: Types.ObjectId
//   parent: Types.ObjectId
//   attachments: string[]
//   content: string
//   createdAt: Date
//   updatedAt: Date
// }

import { optionalString, requiredString } from 'packages/shared/src'
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

export const CommunityCommentValidations = {
  createComment,
  getCommentById,
  deleteCommentById,
}

export type TCreateCommentPayload = z.infer<typeof createComment.shape.body>
export type TGetCommentByIDParams = z.infer<typeof getCommentById.shape.params>
export type TDeleteCommentByIDParams = z.infer<typeof deleteCommentById.shape.params>
