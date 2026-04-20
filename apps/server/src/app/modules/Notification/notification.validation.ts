import { notificationDeviceTypeValues } from 'packages/db/src/apps/modules/NotificationToken/notificationToken.constant'
import { optionalEnumString, optionalString, requiredString } from 'packages/shared/src'
import z from 'zod'

const registerToken = z.object({
  body: z.object({
    token: requiredString(),
    deviceType: optionalEnumString(notificationDeviceTypeValues, 'Device Type'),
  }),
})

const getAllNotifications = z.object({
  query: z.object({
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('Sort By'),
    sortOrder: optionalString('Sort Order'),
    isRead: z.boolean().optional().describe('Is Read'),
    page: optionalString('Page'),
    limit: optionalString('Limit'),
    fromDate: optionalString('From Date'),
    toDate: optionalString('To Date'),
  }),
})

const markAsRead = z.object({
  params: z.object({
    id: requiredString('Notifiction ID'),
  }),
})

export const notificationValidations = {
  registerToken,
  getAllNotifications,
  markAsRead,
}

export type TRegisterToken = z.infer<typeof registerToken.shape.body>
export type TGetAllNotifications = z.infer<typeof getAllNotifications.shape.query>
