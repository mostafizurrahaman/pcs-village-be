import { model, Schema } from 'mongoose'

import { notificationTypeValues } from './notification.constant'
import type { INotificationDoc } from './notification.interface'

const notificationSchema = new Schema<INotificationDoc>(
  {
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: notificationTypeValues,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'entityModel',
    },
    entityModel: {
      type: String,
      required: true,
      enum: ['CommunityPost', 'GroupPost', 'Wave', 'Conversation'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

notificationSchema.index({ receiver: 1, createdAt: -1 })

export const Notification = model<INotificationDoc>('Notification', notificationSchema)
