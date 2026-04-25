import { Conversation, Message, type IUser } from '@repo/db'
import type {
  TGetAllConversationQueryType,
  TGetAllMessageQueryType,
} from './conversation.validations'
import { Types, type PipelineStage } from 'mongoose'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { uploadMultipleFileToS3 } from 'packages/media-hub/src'
export const searchableFields = ['opponentName', 'opponentEmail']

const getAllConversations = async (user: IUser, query: TGetAllConversationQueryType) => {
  const {
    page = 1,
    limit = 10,
    fromDate,
    toDate,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query

  const pipeline: PipelineStage[] = []

  pipeline.push({
    $match: {
      participant: {
        $in: [user?._id],
      },
    },
  })

  pipeline.push({
    $addFields: {
      opponent: {
        $arrayElemAt: [
          {
            $filter: {
              input: '$participant',
              as: 'p',
              cond: {
                $ne: [new Types.ObjectId(user?._id), '$$p'],
              },
            },
          },
          0,
        ],
      },
    },
  })

  pipeline.push({
    $lookup: {
      from: 'messages',
      localField: 'lastMessage',
      foreignField: '_id',
      as: 'lastMessage',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'opponent',
      foreignField: '_id',
      as: 'opponent',
      pipeline: [
        {
          $lookup: {
            from: 'userprofiles',
            localField: '_id',
            foreignField: 'user',
            as: 'profile',
          },
        },

        {
          $unwind: '$profile',
        },

        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            profileImage: 1,
          },
        },
      ],
    },
  })

  pipeline.push({
    $unwind: {
      path: '$opponent',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $unwind: {
      path: '$lastMessage',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $project: {
      opponentName: '$opponent.name',
      opponentEmail: '$opponent.email',
      opponentProfileImg: '$opponent.profileImage',
      initiator: 1,
      lastMessage: 1,
      createdAt: '$createdAt',
      updatedAt: '$updatedAt',
    },
  })

  // Now start applying filters :
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}

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

  // search term:
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => {
          return { [field]: { $regex: searchTerm, $options: 'i' } }
        }),
      },
    })
  }

  //   sorting:
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    },
  })

  // pagination:
  const dataPage = Number(page) || 1
  const dataLimit = Number(limit) || 10
  const skip = (dataPage - 1) * dataLimit

  pipeline.push({
    $facet: {
      data: [
        {
          $skip: skip,
        },
        {
          $limit: dataLimit,
        },
      ],
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  const conversations = await Conversation.aggregate(pipeline)

  const data = conversations[0]?.data
  const total = conversations[0]?.meta?.[0]?.total || 0
  const totalPages = Math.ceil(total / dataLimit)

  return {
    data,
    meta: {
      limit: dataLimit,
      page: dataPage,
      total,
      totalPages,
    },
  }
}

const getAllMessage = async (user: IUser, query: TGetAllMessageQueryType) => {
  const {
    page = 1,
    limit = 10,
    fromDate,
    toDate,
    searchTerm,
    sortBy = 'createdAt',
    conversation: conversationId,
    sortOrder = 'desc',
  } = query

  const pipeline: PipelineStage[] = []

  // 1. Check is conversation exists:
  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    participant: user?._id,
  })

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, `Conversation doesn't exists!`)
  }

  pipeline.push({
    $match: {
      conversation: conversation?._id,
    },
  })

  // Now start applying filters :
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}

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

  // apply search:
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: ['message'].map((field) => {
          return {
            [field]: { $regex: searchTerm, $options: 'i' },
          }
        }),
      },
    })
  }

  //   sorting:
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    },
  })

  // pagination:
  const dataPage = Number(page) || 1
  const dataLimit = Number(limit) || 10
  const skip = (dataPage - 1) * dataLimit

  pipeline.push({
    $facet: {
      data: [
        {
          $skip: skip,
        },
        {
          $limit: dataLimit,
        },
      ],
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  const messages = await Message.aggregate(pipeline)

  const data = messages[0]?.data
  const total = messages[0]?.meta?.[0]?.total || 0
  const totalPages = Math.ceil(total / dataLimit)

  return {
    data,
    meta: {
      limit: dataLimit,
      page: dataPage,
      total,
      totalPages,
    },
  }
}

const uploadAttchments = async (files: Express.Multer.File[]) => {
  if (!Array.isArray(files) || files?.length < 1) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File required!')
  }

  if (files?.length > 3) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You can upload three files at same time!')
  }

  const uploadedFiles = await uploadMultipleFileToS3(files, 'message')

  return uploadedFiles?.map((file) => file.url)
}

export const conversationServices = {
  getAllConversations,
  getAllMessage,
  uploadAttchments,
}
