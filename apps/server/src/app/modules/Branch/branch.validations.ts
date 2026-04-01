import { optionalDate, optionalNumber, optionalString, requiredString } from 'packages/shared/src'
import z from 'zod'

// Validation schema for creating a branch
const createBranch = z.object({
  body: z.object({
    name: requiredString('Branch name'),
  }),
})

// Validation schema for updating a branch by ID
const updateBranch = z.object({
  body: z.object({
    name: requiredString('Branch name'),
  }),
  params: z.object({
    id: requiredString('Branch ID'),
  }),
})

// Validation schema for getting a branch by ID
const getBranchById = z.object({
  params: z.object({
    id: requiredString('Branch ID'),
  }),
})

// Validation schema for deleting a branch by ID
const deleteBranchById = z.object({
  params: z.object({
    id: requiredString('Branch ID'),
  }),
})

// Validation schema for getting all branches with filters, pagination, and sorting
const getAllBrnaches = z.object({
  query: z.object({
    page: optionalNumber('Page number').default(1),
    limit: optionalNumber('Items per page').default(10),
    searchTerm: optionalString('Search term'),
    sort: optionalString('Sort by field').default('createdAt'),
    fromDate: optionalDate("From Date (format: 'YYYY-MM-DD')"),
    toDate: optionalDate("To Date (format: 'YYYY-MM-DD')"),
  }),
})

export const BranchValidation = {
  createBranch,
  updateBranch,
  getBranchById,
  deleteBranchById,
  getAllBrnaches,
}

// Payload type for creating a branch
export type ICreateBranchPayload = z.infer<typeof createBranch.shape.body>

// Payload type for updating a branch
export type IUpdateBranchPayload = z.infer<typeof updateBranch.shape.body>

// Params type for updating a branch
export type IUpdateBranchParams = z.infer<typeof updateBranch.shape.params>

// Params type for getting a branch by ID
export type IGetBranchByIdParams = z.infer<typeof getBranchById.shape.params>

// Params type for deleting a branch
export type IDeleteBranchByIdParams = z.infer<typeof deleteBranchById.shape.params>

// Query type for getting all branches
export type IGetAllBranchesQuery = z.infer<typeof getAllBrnaches.shape.query>
