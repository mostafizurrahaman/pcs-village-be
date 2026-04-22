import { requiredString } from '@repo/shared'
import z from 'zod'

const createCheckoutSession = z.object({
  body: z.object({
    planId: requiredString('Plan ID'),
  }),
})

export const SubscriptionValidations = {
  createCheckoutSession,
}

export type TCreateCheckoutPayload = z.infer<typeof createCheckoutSession.shape.body>
