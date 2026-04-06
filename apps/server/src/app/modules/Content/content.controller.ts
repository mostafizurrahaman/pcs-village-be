import { catchAsync, sendResponse } from '@repo/shared'
import { ContentServices } from './content.services'
import httpStatus from 'http-status'

const updateOrCreateContent = catchAsync(async (req, res) => {
  const result = await ContentServices.updateOrCreateContent(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Content updated successfully!`,
    data: result,
  })
})

const getCotent = catchAsync(async (req, res) => {
  const result = await ContentServices.updateOrCreateContent(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Content retrieved successfully!`,
    data: result,
  })
})

export const ContentController = {
  updateOrCreateContent,
  getCotent,
}
