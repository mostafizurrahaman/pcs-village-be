import { optionalNumber, optionalString, requiredString } from '@repo/shared'
import z from 'zod'

const blockUserSchema = z.object({
  params: z.object({
    id: requiredString('User ID'),
  }),
  body: z
    .object({
      reason: optionalString('Reason'),
    })
    .optional(),
})

const unblockUserSchema = z.object({
  params: z.object({
    id: requiredString('User ID'),
  }),
})

const getMyBlockedUsersSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search Term'),
  }),
})

export const BlockValidations = {
  blockUserSchema,
  unblockUserSchema,
  getMyBlockedUsersSchema,
}

export type TBlockUserBody = {
  reason?: string
}

export type TGetMyBlockedUsersQuery = {
  page?: number
  limit?: number
  searchTerm?: string
}
