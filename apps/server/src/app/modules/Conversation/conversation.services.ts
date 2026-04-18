import { Conversation, type IUser } from '@repo/db'
import type { TGetAllConversationQueryType } from './conversation.validations'
import { Types, type PipelineStage } from 'mongoose'

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

export const conversationServices = {
  getAllConversations,
}
