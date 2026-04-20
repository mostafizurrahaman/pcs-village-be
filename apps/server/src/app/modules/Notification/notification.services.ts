// notification.service.ts

import { firebaseAdmin } from '@app/configs/firebase'
import { Notification, type IUser } from '@repo/db'
import { NotificationToken } from '@repo/db'
import type { TGetAllNotifications } from './notification.validation'
import type { PipelineStage, Types } from 'mongoose'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'

// import type { TRegisterToken } from './notification.validation'

type CreateNotificationPayload = {
  title: string
  body: string
  type: NotificationType
  data?: Record<string, unknown>
}

/**
 * Create notification in DB and send push
 */
export const createAndSendNotification = async (
  userId: Types.ObjectId,
  payload: CreateNotificationPayload
) => {
  // 1️⃣ Save in DB
  const notification = await Notification.create({
    sender: userId,
    ...payload,
  })

  // 2️⃣ Send push (async, don't block main flow if you want)
  await sendPushNotification(userId, payload)

  return notification
}

/**
 * Send FCM push to all active user devices
 */
export const sendPushNotification = async (userId: string, payload: CreateNotificationPayload) => {
  const tokens = await NotificationToken.find({
    user: userId,
    isActive: true,
  })

  if (!tokens.length) return

  const formattedData = payload.data
    ? Object.entries(payload.data).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value)
          return acc
        },
        {} as Record<string, string>
      )
    : {}

  const response = await firebaseAdmin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: formattedData,
  })

  // 3️⃣ Remove invalid tokens
  await Promise.all(
    response.responses.map(async (res, index) => {
      if (!res.success) {
        await NotificationToken.findOneAndDelete({
          token: tokens[index]!.token,
        })
      }
    })
  )
}

// ** Register Device Token:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registerToken = async (user: IUser, payload: any) => {
  const { token, deviceType } = payload

  const result = await NotificationToken.findOneAndUpdate(
    {
      user: user._id,
      deviceType: deviceType,
    },

    {
      $set: {
        token,
        isActive: true,
      },
    },
    { upsert: true, returnDocument: 'after' }
  )

  return result
}

// ** Get all notifications:

const getAllNotifications = async (userId: Types.ObjectId, query: TGetAllNotifications) => {
  const {
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = '1',
    limit = '10',
    isRead,
    fromDate,
    toDate,
  } = query

  const searchtableFields = ['title', 'body', 'userName', 'userEmail']

  const pipeline: PipelineStage[] = [
    {
      $match: {
        user: userId,
      },
    },
  ]

  if (isRead !== undefined) {
    pipeline.push({
      $match: {
        isRead,
      },
    })
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }

    pipeline.push({
      $match: {
        createdAt: dateFilter,
      },
    })
  }

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user',
      pipeline: [
        {
          $project: {
            name: 1,
            email: 1,
            _id: 1,
          },
        },
      ],
    },
  })

  pipeline.push({
    $addFields: {
      userName: { $arrayElemAt: ['$user.name', 0] },
      userEmail: { $arrayElemAt: ['$user.email', 0] },
      userId: { $arrayElemAt: ['$user._id', 0] },
    },
  })

  pipeline.push({
    $project: {
      user: 0,
    },
  })

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          ...searchtableFields.map((field) => ({ [field]: { $regex: searchTerm, $options: 'i' } })),
        ],
      },
    })
  }

  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    },
  })

  pipeline.push({
    $facet: {
      meta: [{ $count: 'total' }],
      data: [{ $skip: (parseInt(page) - 1) * parseInt(limit) }, { $limit: parseInt(limit) }],
    },
  })

  const result = await Notification.aggregate(pipeline)

  const data = result[0]?.data || []
  const total = result[0]?.meta[0]?.total || 0
  const totalPages = Math.ceil(total / parseInt(limit))

  return {
    data,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
    },
  }
}

const markAsRead = async (userId: Types.ObjectId, notificationId: string) => {
  const notification = await Notification.findOne({
    user: userId,
    _id: notificationId,
  })

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found!')
  }

  if (notification.isRead) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification has already been read!')
  }

  notification.isRead = true
  notification.readAt = new Date()

  notification.save()

  return notification
}

export const notificationServices = {
  createAndSendNotification,
  sendPushNotification,
  registerToken,
  getAllNotifications,
  markAsRead,
}
