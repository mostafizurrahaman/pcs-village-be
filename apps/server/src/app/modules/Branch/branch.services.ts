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

  const branch = await Branch.create({
    name: data.name,
    slug,
  })

  return branch
}

// 2. Update Branch api:
const updateBranch = async (id: string, data: Partial<ICreateBranchPayload>) => {
  // 1. Check if branch exists
  const existingBranch = await Branch.findById(id)
  if (!existingBranch) {
    throw new AppError(httpStatus.NOT_FOUND, 'Branch not found')
  }

  // 2. If no data provided
  if (!data || Object.keys(data).length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No update data provided')
  }

  // 3. Handle name update
  if (data.name) {
    const normalizedName = data.name.toLowerCase().trim()

    // 4. Skip if same name (avoid unnecessary DB queries)
    if (normalizedName === existingBranch.name) {
      return existingBranch
    }

    // 5. Check duplicate name
    const duplicateBranch = await Branch.findOne({
      name: normalizedName,
      _id: { $ne: id },
    })

    if (duplicateBranch) {
      throw new AppError(httpStatus.CONFLICT, 'Branch with this name already exists')
    }

    // 6. Generate slug
    const newSlug = slugify(normalizedName)

    // 7. Check duplicate slug
    const duplicateSlug = await Branch.findOne({
      slug: newSlug,
      _id: { $ne: id },
    })

    if (duplicateSlug) {
      throw new AppError(httpStatus.CONFLICT, 'Slug already exists')
    }

    // 8. Update values
    existingBranch.name = normalizedName
    existingBranch.slug = newSlug
  }

  // 9. Save with duplicate error handling
  try {
    await existingBranch.save()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError(httpStatus.CONFLICT, 'Duplicate field value')
    }
    throw error
  }

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
