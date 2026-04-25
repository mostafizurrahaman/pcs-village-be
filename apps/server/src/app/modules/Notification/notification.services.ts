import { firebaseAdmin } from '@app/configs/firebase'
import { Notification, NotificationToken, type TNotificationType } from '@repo/db'
import type { TGetAllNotifications } from './notification.validation'
import mongoose, { type ClientSession, type PipelineStage, Types } from 'mongoose'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { logger } from '@app/libs/logger'

type CreateNotificationPayload = {
  receiver: string | Types.ObjectId
  sender: string | Types.ObjectId
  title: string
  message: string // Changed from 'body' to 'message' to match Interface
  type: TNotificationType
  entityId: string | Types.ObjectId
  entityModel: 'CommunityPost' | 'GroupPost' | 'Wave' | 'Conversation'
}

/**
 * Create notification in DB and send FCM push
 */
const createAndSendNotification = async (
  payload: CreateNotificationPayload,
  session: ClientSession | null
) => {
  const notification = await Notification.create(
    [
      {
        ...payload,
        isRead: false,
      },
    ],
    { session }
  )

  let data = null

  if (session) {
    data = await mongoose.model(payload.entityModel).findById(payload.entityId).session(session)
  }

  if (!data) return

  // ⚠️ Don't include external calls in transaction
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

  return notification[0]
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

  logger.info('userID', userId)

  const pipeline: PipelineStage[] = [{ $match: { receiver: new Types.ObjectId(userId) } }]

  pipeline.push(
    {
      $lookup: {
        from: 'communityposts',
        localField: 'entityId',
        foreignField: '_id',
        as: 'communityPost',
      },
    },
    {
      $lookup: {
        from: 'groupposts',
        localField: 'entityId',
        foreignField: '_id',
        as: 'groupPost',
      },
    },
    {
      $lookup: {
        from: 'waves',
        localField: 'entityId',
        foreignField: '_id',
        as: 'wave',
      },
    },
    {
      $lookup: {
        from: 'conversations',
        localField: 'entityId',
        foreignField: '_id',
        as: 'conversation',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'sender',
        foreignField: '_id',
        as: 'sender',
      },
    }
  )

  pipeline.push({
    $unwind: {
      path: '$sender',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $addFields: {
      entityDetails: {
        $switch: {
          branches: [
            {
              case: { $eq: ['$entityModel', 'CommunityPost'] },
              then: { $arrayElemAt: ['$communityPost', 0] },
            },
            {
              case: { $eq: ['$entityModel', 'GroupPost'] },
              then: { $arrayElemAt: ['$groupPost', 0] },
            },
            {
              case: { $eq: ['$entityModel', 'Wave'] },
              then: { $arrayElemAt: ['$wave', 0] },
            },
            {
              case: { $eq: ['$entityModel', 'Conversation'] },
              then: { $arrayElemAt: ['$conversation', 0] },
            },
          ],
          default: null,
        },
      },
      senderId: '$sender._id',
      senderName: '$sender.name',
      senderImage: '$sender.profileImage',
    },
  })

  pipeline.push({
    $project: {
      sender: 0,
      communityPost: 0,
      groupPost: 0,
      wave: 0,
      conversation: 0,
    },
  })

  // // Handle boolean conversion from query string
  if (isRead !== undefined) {
    const isReadBool = String(isRead) === 'true'
    pipeline.push({ $match: { isRead: isReadBool } })
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { message: { $regex: searchTerm, $options: 'i' } },
          { type: { $regex: searchTerm, $options: 'i' } },
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
