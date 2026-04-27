import {
  enumString,
  optionalDate,
  optionalEnumString,
  optionalString,
  requiredString,
} from '@repo/shared'
import z from 'zod/v4'

// Schema for GET / (Query parameters)
const getAllUserSchema = z.object({
  query: z.object({
    page: optionalString('Page')
      .optional()
      .transform((val) => (val ? Number(val) : 1)),
    limit: optionalString('Limit')
      .optional()
      .transform((val) => (val ? Number(val) : 10)),
    searchTerm: optionalString('Search Term').optional(),
    sortBy: optionalString('Sort By').optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    fromDate: optionalDate('From Date').optional(), // Handled as string for conversion in Service
    toDate: optionalDate('To Date').optional(),
    status: z.enum(['active', 'blocked']).optional(),
    role: z.enum(['admin', 'user', 'manager']).optional(),
  }),
})

// Schema for GET /:id (Params)
const getSingleUserSchema = z.object({
  params: z.object({
    id: requiredString('User ID').refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid User ID format (must be a valid MongoDB ObjectId)',
    }),
  }),
})

const deleteUserByID = z.object({
  params: z.object({
    id: requiredString('User ID').refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid User ID format (must be a valid MongoDB ObjectId)',
    }),
  }),
})

const dashboardQuerySchema = z.object({
  query: z.object({
    year: z
      .string()
      .regex(/^\d{4}$/, 'Year must be a valid 4-digit number (e.g., 2024)')
      .optional()
      .default(new Date().getFullYear().toString())
      .transform((val) => Number(val)),

    weekType: optionalEnumString(['this-week', 'last-week'], 'Week Type').default('this-week'),
  }),
})

export const AdminValidations = { dashboardQuerySchema }

export const UserValidations = {
  getAllUserSchema,
  getSingleUserSchema,
  deleteUserByID,
}

// Types for your Service/Controller
export type IGetAllUserQueryType = z.infer<typeof getAllUserSchema.shape.query>
export type IGetDashboardStatsQueryType = z.infer<typeof dashboardQuerySchema.shape.query>
