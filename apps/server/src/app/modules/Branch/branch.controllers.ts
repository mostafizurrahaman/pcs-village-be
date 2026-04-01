import { catchAsync, sendResponse } from '@repo/shared'
import { branchServices } from './branch.services'
import httpStatus from 'http-status'
import type { IGetAllBranchesQuery } from './branch.validations'

// Create a new branch
const createBranch = catchAsync(async (req, res) => {
  const payload = req.body

  const branch = await branchServices.createBranch(payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Branch created successfully',
    data: branch,
  })
})

// Update an existing branch by ID
const updateBranch = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const payload = req.body

  const branch = await branchServices.updateBranch(id, payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Branch updated successfully',
    data: branch,
  })
})

// Get a single branch by ID
const getBranchById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const branch = await branchServices.getBranchById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Branch retrieved successfully',
    data: branch,
  })
})

// Delete a branch by ID
const deleteBranchById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const branch = await branchServices.deleteBranchById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Branch deleted successfully',
    data: branch,
  })
})

// Get all branches with query filters and pagination
const getAllBranches = catchAsync(async (req, res) => {
  const query = req.query as unknown as IGetAllBranchesQuery
  const result = await branchServices.getAllBranches(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Branches retrieved successfully',
    data: result.data,
    meta: result.meta,
  })
})

export const branchControllers = {
  createBranch,
  updateBranch,
  getBranchById,
  deleteBranchById,
  getAllBranches,
}
