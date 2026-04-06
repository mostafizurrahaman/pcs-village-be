import { optionalDate, optionalPositive, optionalString, requiredString } from 'packages/shared/src'
import z from 'zod'

const createFaqSchema = z.object({
  body: z.object({
    question: requiredString('Question'),
    answer: requiredString('Answer'),
  }),
})

const updateFaqSchema = z.object({
  params: z.object({
    id: requiredString('FAQ ID'),
  }),
  body: z.object({
    question: optionalString('Question'),
    answer: optionalString('Answer'),
  }),
})

const getAllFaqSchema = z.object({
  query: z.object({
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    searchTerm: optionalString('SearchTerm'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    sort: optionalString('Sort'),
  }),
})

export const faqValidation = {
  createFaqSchema,
  updateFaqSchema,
  getAllFaqSchema,
}

export type ICreateFaqPayload = z.infer<typeof createFaqSchema.shape.body>
export type IUpdateFaqPayload = z.infer<typeof updateFaqSchema.shape.body>
export type IGetAllFaqQueryType = z.infer<typeof getAllFaqSchema.shape.query>
