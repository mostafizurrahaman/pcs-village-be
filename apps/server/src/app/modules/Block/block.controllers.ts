import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { BlockServices } from './block.services'
import type { TBlockUserBody, TGetMyBlockedUsersQuery } from './block.validations'

const blockUser = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const targetUserId = req.params.id as string
  const body = req.body as TBlockUserBody

  const result = await BlockServices.blockUser(user, targetUserId, body?.reason)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  })
})

const unblockUser = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const targetUserId = req.params.id as string

  const result = await BlockServices.unblockUser(user, targetUserId)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  })
})

const getMyBlockedUsers = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const query = req.query as unknown as TGetMyBlockedUsersQuery

  const result = await BlockServices.getMyBlockedUsers(user, query)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Blocked users retrieved successfully',
    data: result.data,
    meta: result.meta,
  })
})

export const BlockControllers = {
  blockUser,
  unblockUser,
  getMyBlockedUsers,
}
