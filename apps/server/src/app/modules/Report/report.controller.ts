import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'
import { reportServices } from './report.services'
import httpStatus from 'http-status'

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

export const reportController = {
  reportPost,
}
