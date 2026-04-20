import { Document, Types } from 'mongoose'
import { NotificationType } from './notification.constant'

export type TNotificationType = keyof typeof NotificationType

export interface INotification {
  receiver: Types.ObjectId
  sender?: Types.ObjectId
  type: TNotificationType
  title: string
  message: string
  entityId: Types.ObjectId
  entityModel: 'CommunityPost' | 'GroupPost' | 'Wave' | 'Conversation'
  isRead: boolean
  readAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface INotificationDoc extends INotification, Document {}
