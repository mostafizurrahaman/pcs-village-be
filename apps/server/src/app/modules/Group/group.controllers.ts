import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from 'packages/shared/src'
import { groupServices } from './group.services'

import httpStatus from 'http-status'
import type { TGetUserAllGroupQuery } from './group.validtions'

const joinGroup = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const id = req.params.id as string

  const result = await groupServices.joinGroup(user, id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `You have joined successfully!`,
    data: result,
  })
})

const markAsArrived = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await groupServices.markAsArrived(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `You haved into new commer group!`,
    data: result,
  })
})

const getAllGroups = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const query = req.query as unknown as TGetUserAllGroupQuery

  const result = await groupServices.getAllGroups(user, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All Groups retrived successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

export const groupControllers = {
  joinGroup,
  getAllGroups,
  markAsArrived,
}
