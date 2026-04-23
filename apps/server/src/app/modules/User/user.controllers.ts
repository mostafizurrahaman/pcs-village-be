import { catchAsync, sendResponse } from 'packages/shared/src'
import { userServices } from './user.services'
import httpStatus from 'http-status'
import type { IGetAllUserQueryType } from './user.validations'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'

const getAllUser = catchAsync(async (req, res) => {
  const result = await userServices.getAllUserFromDB(req.query as unknown as IGetAllUserQueryType)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Users are retrived successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

const getSingleUser = catchAsync(async (req, res) => {
  const { id } = req.params
  const result = await userServices.getSingleUserFromDB(id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User retrieved successfully!',
    data: result,
  })
})

const deleteUserById = catchAsync(async (req, res) => {
  const { id } = req.params
  const user = await getUserFromRequest(req)
  const result = await userServices.deleteUserPermanently(user, id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User deleted successfully!',
    data: result,
  })
})

export const userControllers = {
  getAllUser,
  getSingleUser, // Add this
  deleteUserById,
}
