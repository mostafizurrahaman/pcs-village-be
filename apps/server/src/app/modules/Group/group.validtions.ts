import { requiredString } from 'packages/shared/src'
import z from 'zod'

const joinGroup = z.object({
  params: z.object({
    id: requiredString('Group ID'),
  }),
})

export const groupValidations = {
  joinGroup,
}

export type TJoinGroup = z.infer<typeof joinGroup.shape.params>
