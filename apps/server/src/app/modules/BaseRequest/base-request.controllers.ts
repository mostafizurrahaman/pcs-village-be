import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'

import type { IGetAllBaseRequestsQuery } from './base-request.valiations'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { baseRequestServices } from './base-request.services'

// Create a new BaseRequest
const createBaseRequest = catchAsync(async (req, res) => {
  const payload = req.body

  const baseRequest = await baseRequestServices.createBaseRequest(payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'BaseRequest created successfully',
    data: baseRequest,
  })
})

// Get a single BaseRequest by ID
const getBaseRequestById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const baseRequest = await baseRequestServices.getBaseRequestById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'BaseRequest retrieved successfully',
    data: baseRequest,
  })
})

// Delete a BaseRequest by ID
const deleteBaseRequestById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const baseRequest = await baseRequestServices.deleteBaseRequestById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'BaseRequest deleted successfully',
    data: baseRequest,
  })
})

// Get all BaseRequests with query filters and pagination
const getAllBaseRequests = catchAsync(async (req, res) => {
  const query = req.query as unknown as IGetAllBaseRequestsQuery

  const result = await baseRequestServices.getAllBaseRequests(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'BaseRequests retrieved successfully',
    data: result.data,
    meta: result.meta,
  })
})

// Resolve the base request:
const resolveRequest = catchAsync(async (req, res) => {
  const requestId = req.params.id as string
  const result = await baseRequestServices.resolveBaseRequest(requestId, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Base request ${req.body.status.toLowerCase()} successfully!`,
    data: result,
  })
})

export const baseRequestControllers = {
  createBaseRequest,
  getBaseRequestById,
  deleteBaseRequestById,
  getAllBaseRequests,
  resolveRequest,
}
