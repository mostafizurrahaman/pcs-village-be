import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from 'packages/shared/src'
import { groupServices } from './group.services'

import httpStatus from 'http-status'
import type { TGetUserAllGroupMembersQuery, TGetUserAllGroupQuery } from './group.validtions'

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

const leaveGroupById = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const id = req.params.id as string

  const result = await groupServices.leaveGroup(user, id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `You have leaved the group successfully!`,
    data: result,
  })
})

const getGroupAllMembers = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const groupId = req.params.id as string
  const query = req.query as TGetUserAllGroupMembersQuery

  const result = await groupServices.getAllGroupMembersById(user, groupId, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All group member retrieved successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

const getMemberProfileById = catchAsync(async (req, res) => {
  const memberId = req.params.id as string

  const result = await groupServices.getMemberProfilebyId(memberId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Member profile is retrived successfully!`,
    data: result,
  })
})

export const groupControllers = {
  joinGroup,
  getAllGroups,
  markAsArrived,
  leaveGroupById,
  getGroupAllMembers,
  getMemberProfileById,
}
