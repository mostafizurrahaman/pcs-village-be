import { catchAsync, sendResponse } from '@repo/shared'
import { notificationServices } from './notification.services'
import httpStatus from 'http-status'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const registerToken = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await notificationServices.registerToken(user._id.toString(), req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Device token registered successfully',
    data: result,
  })
})

const getAllNotifications = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await notificationServices.getAllNotifications(user._id.toString(), req.query)

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
  const result = await notificationServices.markAsRead(user._id.toString(), req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Notification marked as read',
    data: result,
  })
})

const markAllAsRead = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await notificationServices.markAllAsRead(user._id.toString())

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All notifications marked as read',
    data: result,
  })
})

export const notificationControllers = {
  registerToken,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
}
