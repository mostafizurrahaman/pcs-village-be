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

export const communityValidations = {
  createCommunityPost,
  updateCommunityPost,
  getCommunityPostById,
  deleteCommunityPostById,
}

// 1. Create Community Payload interfaces :
export type TCreateCommunityPayload = z.infer<typeof createCommunityPost.shape.body>

// 2. Update Community Payload and params:
export type TUpdateCommunityPayload = z.infer<typeof updateCommunityPost.shape.body>
export type TUpdateCommunityParmas = z.infer<typeof updateCommunityPost.shape.params>
