import { requiredString } from 'packages/shared/src'
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

export const groupPostValidations = {
  createPost,
  deleteGroupPostAttachmentById,
  updateGroupPost,
  getPostById,
}

export type TCreateGroupPost = z.infer<typeof createPost.shape.body>
export type TUpdateGroupPost = z.infer<typeof updateGroupPost.shape.body>
