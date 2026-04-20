import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { catchAsync, sendResponse } from '@repo/shared'

import { notificationServices } from './notification.services'
import httpStatus from 'http-status'

const registerToken = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await notificationServices.registerToken(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Device token registered successfully',
    data: result,
  })
})

const getAllNotifications = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await notificationServices.getAllNotifications(user._id, req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notifications retrieved successfully',
    data: result.data,
    meta: result.meta,
  })
})

const markAsRead = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const id = req.params.id as string

  const result = await notificationServices.markAsRead(user._id, id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notifications makred as read successfully',
    data: result,
  })
})

export const notificationControllers = {
  registerToken,
  getAllNotifications,
  markAsRead,
}
