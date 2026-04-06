import { requiredString } from 'packages/shared/src'
import z from 'zod'

const tooggleLike = z.object({
  params: z.object({
    postId: requiredString('Post ID'),
  }),
})

export const postLikeValidation = {
  tooggleLike,
}
export type TToggleLike = z.infer<typeof tooggleLike.shape.params>
