import {
  enumString,
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredString,
  sortOrderValues,
} from '@repo/shared'
import z from 'zod'
import { sortableFields } from './report.constant'
import { reportStatus } from 'packages/db/src'

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
    sortOrder: optionalEnumString(sortOrderValues, 'Sort Order'),
    sortBy: optionalEnumString(sortableFields, 'Sort By'),
    fromDate: optionalDate('From Date'),
    toDate: optionalDate('To Date'),
  }),
})

const resolveReport = z.object({
  body: z.object({
    adminNote: optionalString('Admin note'),
    status: enumString([reportStatus.APPROVED, reportStatus.REJECTED], 'Status'),
  }),
  params: z.object({
    id: requiredString('Report ID'),
  }),
})
export const reportValidations = {
  reportPost,
  getAllReports,
  resolveReport,
}

// All types:
export type TReportPostPayload = z.infer<typeof reportPost.shape.body>
export type TGetAllReportQueryType = z.infer<typeof getAllReports.shape.query>
export type TResolveReportPayload = z.infer<typeof resolveReport.shape.body>
