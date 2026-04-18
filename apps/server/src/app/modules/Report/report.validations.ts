import {
  enumString,
  optionalDate,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from 'packages/shared/src'
import z from 'zod'

// 1. report post :
const reportPost = z.object({
  body: z.object({
    post: requiredString('Post ID'),
    reason: requiredString('Report reason'),
    isGroup: z.boolean({
      error: () => `Is Group is required`,
    }),
  }),
})

// 2. Get all the reports :
const getAllReports = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Searchterm'),
    sortOrder: enumString(sortOrderValues, 'Sort Order'),
    sortby: enumString(['createdAt', 'Sort By']),
    fromDate: optionalDate('From Date'),
    toDate: optionalDate('To Date'),
  }),
})

export const reportValidations = {
  reportPost,
  getAllReports,
}

// All types:
export type TReportPostPayload = z.infer<typeof reportPost.shape.body>
export type TGetAllReportQueryType = z.infer<typeof getAllReports.shape.query>
