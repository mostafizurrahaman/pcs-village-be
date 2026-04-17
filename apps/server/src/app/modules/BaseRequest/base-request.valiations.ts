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
const createBaseRequest = z.object({
  body: z.object({
    name: requiredString('Duty station name'),
    country: requiredString('Country'),
    state: requiredString('State'),
    city: requiredString('City'),
    type: enumString(DutyStationTypeValues, 'Duty station type'),
    email: requiredString('Email'),
  }),
})

// Validation schema for updating a dutyStation by ID
const updateBaseRequest = z.object({
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
const getBaseRequestById = z.object({
  params: z.object({
    id: requiredString('Duty Station ID'),
  }),
})

// Validation schema for deleting a duty station by ID
const deleteBaseRequestById = z.object({
  params: z.object({
    id: requiredString('Duty Station ID'),
  }),
})

// Validation schema for getting all duty stations with filters, pagination, and sorting
const getAllBaseRequestes = z.object({
  query: z.object({
    page: optionalNumber('Page number').default(1),
    limit: optionalNumber('Items per page').default(10),
    searchTerm: optionalString('Search term'),
    sort: optionalString('Sort by field').default('createdAt'),
    fromDate: optionalDate("From Date (format: 'YYYY-MM-DD')"),
    toDate: optionalDate("To Date (format: 'YYYY-MM-DD')"),
  }),
})

const resolveRequestSchema = z.object({
  body: z.object({
    status: enumString(['APPROVED', 'REJECTED'], 'Status'),
    adminNote: optionalString('Admin Note'),
  }),
  params: z.object({
    id: requiredString('Request ID'),
  }),
})

export const BaseRequestValidation = {
  createBaseRequest,
  updateBaseRequest,
  getBaseRequestById,
  deleteBaseRequestById,
  getAllBaseRequestes,
  resolveRequestSchema,
}

// Payload type for creating a duty station
export type ICreateBase = z.infer<typeof createBaseRequest.shape.body>

// Payload type for updating a duty station
export type IUpdateDutyStationPayload = z.infer<typeof updateBaseRequest.shape.body>

// Params type for updating a duty station
export type IUpdateDutyStationParams = z.infer<typeof updateBaseRequest.shape.params>

// Params type for getting a duty station by ID
export type IGetBaseRequestByIdParams = z.infer<typeof getBaseRequestById.shape.params>

// Params type for deleting a duty station
export type IDeleteBaseRequestByIdParams = z.infer<typeof deleteBaseRequestById.shape.params>

// Query type for getting all duty stations
export type IGetAllBaseRequestsQuery = z.infer<typeof getAllBaseRequestes.shape.query>

// Payload type for resolving a base request
export type IBaseRequestResolvePayload = z.infer<typeof resolveRequestSchema.shape.body>
