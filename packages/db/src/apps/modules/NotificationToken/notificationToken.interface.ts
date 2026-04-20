import type { Document, Types } from 'mongoose'
import type { notificationDeviceType } from './notificationToken.constant'

export type NotificationDeviceType =
  (typeof notificationDeviceType)[keyof typeof notificationDeviceType]

export interface INotificationToken {
  user: Types.ObjectId
  token: string
  deviceType: NotificationDeviceType
  isActive: boolean
  lastUsedAt?: Date
}

export interface INotificationTokenDocument extends INotificationToken, Document {}
