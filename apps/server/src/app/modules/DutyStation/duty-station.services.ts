import { AuthRoles, DutyStation, type IDutyStation, type IUser } from '@repo/db'
import type { ICreateDutyStationPayload, IGetAllDutyStationsQuery } from './duty-station.valiations'
import { AppError, GLOBAL_MESSAGES, QueryBuilder } from 'packages/shared/src'
import httpStatus from 'http-status'
import type { QueryFilter } from 'mongoose'
import configs from '@app/configs'

// 1. Create Duty station:
const createDutyStation = async (user: IUser, payload: ICreateDutyStationPayload) => {
  const { name, country, state, city, type } = payload

  if (name?.toLowerCase() === configs?.base?.name?.toLowerCase()) {
    throw new AppError(httpStatus.BAD_REQUEST, `Base name shouldn't be ${configs?.base?.name}`)
  }

  const newDutyStation = {
    name,
    country,
    state,
    city,
    type,
    suggestedBy: user._id,
    isApproved: user?.role !== AuthRoles.USER, // other roles are super admin and admin
    isDeletable: true,
  }

  const dutyStation = await DutyStation.create(newDutyStation)

  return dutyStation
}

// 2. Update Duty station:
const updateDutyStation = async (id: string, payload: Partial<ICreateDutyStationPayload>) => {
  const existingDutyStation = await DutyStation.findById(id)

  if (!existingDutyStation) {
    throw new AppError(httpStatus.NOT_FOUND, GLOBAL_MESSAGES.DUTY_STATION_NOT_FOUND)
  }

  if (payload?.name && payload?.name?.toLowerCase() === configs?.base?.name?.toLowerCase()) {
    throw new AppError(httpStatus.BAD_REQUEST, `Base name shouldn't be ${configs?.base?.name}`)
  }

  // Update fields dynamically
  Object.assign(existingDutyStation, payload)

  await existingDutyStation.save()

  return existingDutyStation
}

// 3. Get Duty station by ID:
const getDutyStationById = async (id: string) => {
  const existingDutyStation = await DutyStation.findById(id).populate(
    'suggestedBy',
    'name email profileImage'
  )

  if (!existingDutyStation) {
    throw new AppError(httpStatus.NOT_FOUND, GLOBAL_MESSAGES.DUTY_STATION_NOT_FOUND)
  }

  return existingDutyStation
}

// 4. Delete Duty station by ID:
const deleteDutyStationById = async (id: string) => {
  const existingDutyStation = await DutyStation.findOneAndDelete({
    _id: id,
    name: {
      $ne: configs.base.name,
    },
    isDeleteable: true,
  }).populate('suggestedBy', 'name email profileImage')

  if (!existingDutyStation) {
    throw new AppError(httpStatus.NOT_FOUND, GLOBAL_MESSAGES.DUTY_STATION_NOT_FOUND)
  }
  return existingDutyStation
}

// 5. get all duty stations :
const getAllDutyStations = async (query: IGetAllDutyStationsQuery) => {
  const { fromDate, toDate, ...filters } = query

  // 1. searchable fields:
  const searchableFields = ['name', 'country', 'state', 'city']

  const modifiedFilters: QueryFilter<IDutyStation> = {}
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

  const dutyStationQuery = new QueryBuilder<IDutyStation>(
    DutyStation.find(modifiedFilters).populate('suggestedBy', 'name email profileImage'),
    filters
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()

  const dutyStations = await dutyStationQuery.modelQuery
  const meta = await dutyStationQuery.countTotal()

  return {
    data: dutyStations,
    meta,
  }
}

export const dutyStationServices = {
  createDutyStation,
  updateDutyStation,
  getDutyStationById,
  deleteDutyStationById,
  getAllDutyStations,
}
