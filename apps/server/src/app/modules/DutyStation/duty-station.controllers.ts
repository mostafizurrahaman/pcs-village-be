import { catchAsync, sendResponse } from '@repo/shared'

import httpStatus from 'http-status'
import { dutyStationServices } from './duty-station.services'
import type { IGetAllDutyStationsQuery } from './duty-station.valiations'
import { getUserFromRequest } from '@app/libs/get-user-from-requests'


// Create a new dutyStation
const createDutyStation = catchAsync(async (req, res) => {
  const payload = req.body
  const user = await getUserFromRequest(req)

  const dutyStation = await dutyStationServices.createDutyStation(user,    payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'DutyStation created successfully',
    data: dutyStation,
  })
})

// Update an existing dutyStation by ID
const updateDutyStation = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const payload = req.body

  const dutyStation = await dutyStationServices.updateDutyStation(id, payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'DutyStation updated successfully',
    data: dutyStation,
  })
})

// Get a single dutyStation by ID
const getDutyStationById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const dutyStation = await dutyStationServices.getDutyStationById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'DutyStation retrieved successfully',
    data: dutyStation,
  })
})

// Delete a dutyStation by ID
const deleteDutyStationById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const dutyStation = await dutyStationServices.deleteDutyStationById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'DutyStation deleted successfully',
    data: dutyStation,
  })
})

// Get all dutyStationes with query filters and pagination
const getAllDutyStationes = catchAsync(async (req, res) => {
  const query = req.query as unknown as IGetAllDutyStationsQuery
  const result = await dutyStationServices.getAllDutyStations(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'DutyStationes retrieved successfully',
    data: result.data,
    meta: result.meta,
  })
})

export const dutyStationControllers = {
  createDutyStation,
  updateDutyStation,
  getDutyStationById,
  deleteDutyStationById,
  getAllDutyStationes,
}
