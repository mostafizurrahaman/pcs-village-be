import { model, Schema } from 'mongoose'
import type { INotificationTokenDocument } from './notificationToken.interface'
import { notificationDeviceTypeValues } from './notificationToken.constant'

const notificationTokenSchema = new Schema<INotificationTokenDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      enum: notificationDeviceTypeValues,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const NotificationToken = model<INotificationTokenDocument>(
  'NotificationToken',
  notificationTokenSchema
)
