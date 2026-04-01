import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'

export const notFound = catchAsync(async (req, res) => {
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.NOT_FOUND,
    message: `API route not found!`,
    data: null,
  })
})
