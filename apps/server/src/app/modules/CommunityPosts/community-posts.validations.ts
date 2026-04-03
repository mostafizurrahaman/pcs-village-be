import { requiredString } from 'packages/shared/src'
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

export const communityPostValidations = {
  createCommunityPost,
  updateCommunityPost,
  getCommunityPostById,
  deleteCommunityPostById,
  deleteCommunityPostAttachmentById,
}

// 1. Create Community Payload interfaces :
export type TCreateCommunityPayload = z.infer<typeof createCommunityPost.shape.body>

// 2. Update Community Payload and params:
export type TUpdateCommunityPayload = z.infer<typeof updateCommunityPost.shape.body>
export type TUpdateCommunityParmas = z.infer<typeof updateCommunityPost.shape.params>
