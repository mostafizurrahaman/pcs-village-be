import type { QueryFilter } from 'mongoose'
import {
  BaseRequest,
  baseRequestStatus,
  DutyStation,
  type IBaseRequestDoc,
  type IUser,
} from '@repo/db'
import { AppError, QueryBuilder } from '@repo/shared'
import type {
  IBaseRequestResolvePayload,
  ICreateBase,
  IGetAllBaseRequestsQuery,
} from './base-request.valiations'
import configs from '@app/configs'
import httpStatus from 'http-status'
import mongoose from 'mongoose'
import { sendEmail } from 'packages/email-sender/src'

// 1. Create Base Request:
const createBaseRequest = async (payload: ICreateBase) => {
  const { name, country, state, city, type, email } = payload

  if (name?.toLowerCase() === configs?.base?.name?.toLowerCase()) {
    throw new AppError(httpStatus.BAD_REQUEST, `Base name shouldn't be ${configs?.base?.name}`)
  }

  const newBase = {
    name,
    email,
    country,
    state,
    city,
    type,
    status: baseRequestStatus.PENDING,
  }

  const baseRequest = await BaseRequest.create(newBase)

  return baseRequest
}

// 2. Get Base Request by ID:
const getBaseRequestById = async (id: string) => {
  const existing = await BaseRequest.findById(id)

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, `Base doesn't exist!`)
  }

  return existing
}

// 3. Delete Base Request by ID:
const deleteBaseRequestById = async (id: string) => {
  const existing = await BaseRequest.findOneAndDelete({
    _id: id,
    name: {
      $ne: configs.base.name,
    },
  })

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, `Base doesn't exist!`)
  }

  return existing
}

// 4. Get all Base Requests:
const getAllBaseRequests = async (query: IGetAllBaseRequestsQuery) => {
  const { fromDate, toDate, ...filters } = query

  const searchableFields = ['name', 'country', 'state', 'city']

  const modifiedFilters: QueryFilter<IBaseRequestDoc> = {}

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}

    if (fromDate) dateFilter.$gte = fromDate
    if (toDate) dateFilter.$lte = toDate

    modifiedFilters.createdAt = dateFilter
  }

  const dutyStationQuery = new QueryBuilder<IBaseRequestDoc>(
    BaseRequest.find(modifiedFilters),
    filters
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()

  const data = await dutyStationQuery.modelQuery
  const meta = await dutyStationQuery.countTotal()

  return { data, meta }
}

const resolveBaseRequest = async (requestId: string, payload: IBaseRequestResolvePayload) => {
  const { status, adminNote } = payload

  const session = await mongoose.startSession()
  try {
    session.startTransaction()

    // 1. Find the request:
    const request = await BaseRequest.findById(requestId).session(session)
    if (!request) {
      throw new AppError(httpStatus.NOT_FOUND, 'Base request not found!')
    }

    if (request.status !== 'PENDING') {
      throw new AppError(httpStatus.BAD_REQUEST, `This request is already ${request.status}`)
    }

    if (status === 'APPROVED') {
      // 2. Create Duty Station
      const [newStation] = await DutyStation.create(
        [
          {
            name: request.name,
            country: request.country,
            state: request.state,
            city: request.city,
            type: request.type,
            isApproved: true,
            isDeleteable: true,
          },
        ],
        { session }
      )

      // 3. Update Request Status :
      request.status = 'APPROVED'
      await request.save({ session })

      // 4. Send Email to inform user
      await sendEmail({
        to: request.email,
        subject: 'Base Request Approved - PCS Village',
        html: `
          <p>Hello,</p>
          <p>Good news! Your requested base <b>${request.name}</b> has been approved. 
          You can use it in your profile right now.</p>
          <p>Thank you for helping us grow the community!</p>
        `,
      })
    } else {
      // 5. UPdate Rejction and send email to user
      request.status = 'REJECTED'
      request.adminNote = adminNote || 'Information provided was insufficient or incorrect.'
      await request.save({ session })

      await sendEmail({
        to: request.email,
        subject: 'Update on your Base Request - PCS Village',
        html: `
          <p>Hello,</p>
          <p>We reviewed your request for the base <b>${request.name}</b>, but unfortunately, it was not approved at this time.</p>
          <p><b>Reason:</b> ${request.adminNote}</p>
          <p>If you believe this was a mistake, please submit a new request with correct details.</p>
        `,
      })
    }

    await session.commitTransaction()
    return request
  } catch (error: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message)
  } finally {
    session.endSession()
  }
}

export const baseRequestServices = {
  createBaseRequest,
  getBaseRequestById,
  deleteBaseRequestById,
  getAllBaseRequests,
  resolveBaseRequest,
}
