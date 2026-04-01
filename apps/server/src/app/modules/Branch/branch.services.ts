import { Branch, type IBranch } from 'packages/db/src'
import type { ICreateBranchPayload, IGetAllBranchesQuery } from './branch.validations'
import { AppError, slugify } from 'packages/shared/src'
import httpStatus from 'http-status'
import { QueryBuilder } from 'packages/shared/src/app/builders'
import type { QueryFilter } from 'mongoose'

// 1. Create Branch api:
const createBranch = async (data: ICreateBranchPayload) => {
  const slug = slugify(data.name)

  // Check is there any already exists?:
  const existingBranch = await Branch.findOne({
    slug,
  })

  if (existingBranch) {
    throw new AppError(httpStatus.CONFLICT, 'Branch with this name already exists')
  }

  const branch = await Branch.create(data)

  return branch
}

// 2. Update Branch api:
const updateBranch = async (id: string, data: Partial<ICreateBranchPayload>) => {
  const slug = slugify(data.name as string)

  // Check is there any already exists?:
  const existingBranch = await Branch.findOne({
    slug,
  })

  if (!existingBranch) {
    throw new AppError(httpStatus.NOT_FOUND, 'Branch not found')
  }

  if (existingBranch && existingBranch._id.toString() !== id) {
    throw new AppError(httpStatus.CONFLICT, 'Branch with this name already exists')
  }

  if (slug !== existingBranch?.slug) {
    existingBranch.slug = slug
  }

  existingBranch.name = data.name as string
  existingBranch.save()

  return existingBranch
}

// 3. get branch by id:
const getBranchById = async (id: string) => {
  const branch = await Branch.findById(id)

  if (!branch) {
    throw new AppError(httpStatus.NOT_FOUND, 'Branch not found')
  }

  return branch
}

// 4. delete branch by id :
const deleteBranchById = async (id: string) => {
  const branch = await Branch.findByIdAndDelete(id)

  if (!branch) {
    throw new AppError(httpStatus.NOT_FOUND, 'Branch not found')
  }

  return branch
}

// 5. get all branches :
const getAllBranches = async (query: IGetAllBranchesQuery) => {
  const { fromDate, toDate, ...filters } = query

  // 1. searchable fields:
  const searchableFields = ['name']

  const modifiedFilters: QueryFilter<IBranch> = {}
  //   2. date filter:
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) {
      dateFilter.$gte = fromDate
    }
    if (toDate) {
      dateFilter.$lte = toDate
    }
    modifiedFilters.createdAt = dateFilter
  }

  const branchQuery = new QueryBuilder<IBranch>(Branch.find(modifiedFilters), filters)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()

  const branches = await branchQuery.modelQuery
  const meta = await branchQuery.countTotal()

  return {
    data: branches,
    meta,
  }
}

export const branchServices = {
  createBranch,
  updateBranch,
  getBranchById,
  deleteBranchById,
  getAllBranches,
}
