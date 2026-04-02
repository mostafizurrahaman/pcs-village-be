import { DutyStationTypeValues } from 'packages/db/src'
import {
  enumString,
  optionalDate,
  optionalNumber,
  optionalString,
  requiredString,
} from 'packages/shared/src'
import z from 'zod'

// Validation schema for creating a duty station
const createDutyStation = z.object({
  body: z.object({
    name: requiredString('Duty station name'),
    country: requiredString('Country'),
    state: requiredString('State'),
    city: requiredString('City'),
    type: enumString(DutyStationTypeValues, 'Duty station type'),
  }),
})

// Validation schema for updating a dutyStation by ID
const updateDutyStation = z.object({
  body: z.object({
    name: requiredString('Duty station name'),
    country: requiredString('Country'),
    state: requiredString('State'),
    city: requiredString('City'),
    type: enumString(DutyStationTypeValues, 'Duty station type'),
  }),
  params: z.object({
    id: requiredString('Duty Station ID'),
  }),
})

// Validation schema for getting a duty station by ID
const getDutyStationById = z.object({
  params: z.object({
    id: requiredString('Duty Station ID'),
  }),
})

// Validation schema for deleting a duty station by ID
const deleteDutyStationById = z.object({
  params: z.object({
    id: requiredString('Duty Station ID'),
  }),
})

// Validation schema for getting all duty stations with filters, pagination, and sorting
const getAllDutyStations = z.object({
  query: z.object({
    page: optionalNumber('Page number').default(1),
    limit: optionalNumber('Items per page').default(10),
    searchTerm: optionalString('Search term'),
    sort: optionalString('Sort by field').default('createdAt'),
    fromDate: optionalDate("From Date (format: 'YYYY-MM-DD')"),
    toDate: optionalDate("To Date (format: 'YYYY-MM-DD')"),
  }),
})

export const DutyStationValidation = {
  createDutyStation: createDutyStation,
  updateDutyStation,
  getDutyStationById,
  deleteDutyStationById,
  getAllDutyStations,
}

// Payload type for creating a duty station
export type ICreateDutyStationPayload = z.infer<typeof createDutyStation.shape.body>

// Payload type for updating a duty station
export type IUpdateDutyStationPayload = z.infer<typeof updateDutyStation.shape.body>

// Params type for updating a duty station
export type IUpdateDutyStationParams = z.infer<typeof updateDutyStation.shape.params>

// Params type for getting a duty station by ID
export type IGetDutyStationByIdParams = z.infer<typeof getDutyStationById.shape.params>

// Params type for deleting a duty station
export type IDeleteDutyStationByIdParams = z.infer<typeof deleteDutyStationById.shape.params>

// Query type for getting all duty stations
export type IGetAllDutyStationsQuery = z.infer<typeof getAllDutyStations.shape.query>
