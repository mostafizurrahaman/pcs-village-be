import { optionalString } from '@repo/shared'
import z from 'zod'

const contentSchema = z.object({
  body: z.object({
    aboutUs: optionalString('aboutUs'),
    privacyPolicy: optionalString('privacyPolicy'),
    termsAndCondition: optionalString('termsAndCondition'),
  }),
})

export const contentValidation = {
  contentSchema,
}

export type IContentPayload = z.infer<typeof contentSchema.shape.body>
