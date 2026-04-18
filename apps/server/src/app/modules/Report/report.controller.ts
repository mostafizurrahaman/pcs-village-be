import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'
import { reportServices } from './report.services'
import httpStatus from 'http-status'
import type { TGetAllReportQueryType } from './report.validations'

// 1. Report post:
const reportPost = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)

  const result = await reportServices.reportPost(user, body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The post has been reported successfully!',
    data: result,
  })
})

// 1. Get all reports:
const getAllReports = catchAsync(async (req, res) => {
  const query = req.query as TGetAllReportQueryType

  const result = await reportServices.getAllReports(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Retrived all reports successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const reportController = {
  reportPost,
  getAllReports,
}
