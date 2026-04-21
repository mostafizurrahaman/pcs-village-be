import { firebaseAdmin } from '@app/configs/firebase'
import { Notification, NotificationToken, type TNotificationType } from '@repo/db'
import type { TGetAllNotifications } from './notification.validation'
import mongoose, { type PipelineStage, Types } from 'mongoose'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

type CreateNotificationPayload = {
  receiver: string | Types.ObjectId
  title: string
  message: string // Changed from 'body' to 'message' to match Interface
  type: TNotificationType
  entityId: string | Types.ObjectId
  entityModel: 'CommunityPost' | 'GroupPost' | 'Wave' | 'Conversation'
}

/**
 * Create notification in DB and send FCM push
 */
const createAndSendNotification = async (payload: CreateNotificationPayload) => {
  // 1. Save in DB for Persistence (Bell Icon)
  const notification = await Notification.create({
    ...payload,
    isRead: false,
  })

  // 1. Retrive the data for the entity:
  const data = await mongoose.model(payload.entityModel).findById(payload.entityModel)
  if (!data) {
    return
  }

  // 2. Send Push Notification via FCM
  await sendPushNotification(payload.receiver.toString(), {
    title: payload.title,
    body: payload.message,
    data: {
      entityId: payload.entityId.toString(),
      entityModel: payload.entityModel,
      type: payload.type,
      entityDetails: data.toObject(),
    },
  })

  return notification
}

/**
 * Internal logic to send FCM push to all active devices of a user
 */
const sendPushNotification = async (
  receiverId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) => {
  const tokens = await NotificationToken.find({
    user: receiverId,
    isActive: true,
  })

  if (!tokens.length) return

  const response = await firebaseAdmin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: payload.title,
      body: payload.body,
    },
    ...(payload.data && { data: payload.data }),
  })

  // Cleanup invalid tokens (those uninstalled or expired)
  const tokensToRemove: string[] = []
  response.responses.forEach((res, index) => {
    if (!res.success) {
      const error = res.error as any
      if (
        error?.code === 'messaging/registration-token-not-registered' ||
        error?.code === 'messaging/invalid-registration-token'
      ) {
        tokensToRemove.push(tokens[index]!.token)
      }
    }
  })

  if (tokensToRemove.length > 0) {
    await NotificationToken.deleteMany({ token: { $in: tokensToRemove } })
  }
}

const registerToken = async (userId: string, payload: { token: string; deviceType: string }) => {
  const { token, deviceType } = payload

  return await NotificationToken.findOneAndUpdate(
    { user: userId, deviceType },
    { $set: { token, isActive: true } },
    { upsert: true, new: true }
  )
}

const getAllNotifications = async (userId: string, query: TGetAllNotifications) => {
  const {
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '10',
    isRead,
  } = query

  const pipeline: PipelineStage[] = [{ $match: { receiver: new Types.ObjectId(userId) } }]

  // Handle boolean conversion from query string
  if (isRead !== undefined) {
    const isReadBool = String(isRead) === 'true'
    pipeline.push({ $match: { isRead: isReadBool } })
  }

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'sender',
      foreignField: '_id',
      as: 'senderInfo',
      pipeline: [{ $project: { name: 1, profileImage: 1 } }],
    },
  })

  pipeline.push({ $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } })

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { message: { $regex: searchTerm, $options: 'i' } },
        ],
      },
    })
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  pipeline.push({
    $facet: {
      meta: [{ $count: 'total' }],
      data: [
        { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ],
    },
  })

  const result = await Notification.aggregate(pipeline)
  const total = result[0]?.meta[0]?.total || 0

  return {
    data: result[0]?.data || [],
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  }
}

const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, receiver: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  )

  if (!notification) throw new AppError(httpStatus.NOT_FOUND, 'Notification not found')
  return notification
}

const markAllAsRead = async (userId: string) => {
  return await Notification.updateMany(
    { receiver: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  )
}

export const notificationServices = {
  createAndSendNotification,
  registerToken,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
}
