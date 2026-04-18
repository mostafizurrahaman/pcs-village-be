// 1. Report Post:

import { Report, type IUser } from '@repo/db'
import type { TGetAllReportQueryType, TReportPostPayload } from './report.validations'
import { model, type PipelineStage } from 'mongoose'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { searchableFields } from './report.constant'

// 1. Report post:
const reportPost = async (user: IUser, payload: TReportPostPayload) => {
  // 1. destructure :
  const { post: postId, reason, isGroup } = payload

  //  2. Find out the model :
  const modelName = isGroup ? 'GroupPost' : 'CommunityPost'

  //  3. Get the model :
  const Model = model(modelName)

  //  4. Check is post exists?:
  const post = await Model.findById(postId)
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exists!`)
  }

  // 5. have you already reported for same post?:
  const isReportAlready = await Report.findOne({
    post: post?._id,
    reporter: user?._id,
  })

  if (isReportAlready) {
    throw new AppError(httpStatus.BAD_REQUEST, `You have already reported the post!`)
  }

  //  6. prepare payload:
  const newPayload = {
    post: post?._id,
    reporter: user?._id,
    isGroup,
    postModel: modelName,
    reason,
  }

  //  7. Save the data :
  const report = await Report.create(newPayload)
  return report
}

// 2. Get all reports :
const getAllReports = async (query: TGetAllReportQueryType) => {
  const {
    limit = 10,
    page = 1,
    sortOrder = 'desc',
    sortBy = 'reportedAt',
    fromDate,
    toDate,
    searchTerm,
  } = query

  const pipeline: PipelineStage[] = []

  // 1. lookup reporter information:
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'reporter',
      foreignField: '_id',
      as: 'reporter',
    },
  })

  pipeline.push({
    $unwind: {
      path: '$reporter',
      preserveNullAndEmptyArrays: true,
    },
  })

  //2. lookup both post table data :
  pipeline.push({
    $lookup: {
      from: 'communityposts',
      localField: 'post',
      foreignField: '_id',
      as: 'communityPosts',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'groupposts',
      localField: 'post',
      foreignField: '_id',
      as: 'groupPosts',
    },
  })

  // 3. Get the correct post data based on postModel:

  pipeline.push({
    $addFields: {
      postData: {
        $cond: {
          if: { $eq: ['$postModel', 'GroupPost'] },
          then: { $arrayElemAt: ['$groupPosts', 0] },
          else: { $arrayElemAt: ['$communityPosts', 0] },
        },
      },
    },
  })

  pipeline.push({
    $addFields: {
      author: '$postData.author',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'authorInfo',
    },
  })

  // searchable fields:

  pipeline.push({
    $unwind: {
      path: '$authorInfo',
      preserveNullAndEmptyArrays: true,
    },
  })

  // 4. do the projection now :
  pipeline.push({
    $project: {
      // reporter info:
      reporterId: '$reporter._id',
      reporterName: '$reporter.name',
      reporterEmail: '$reporter.email',
      reporterImage: '$reporter.profileImage',
      reportReason: '$reason',
      isGroup: '$isGroup',
      status: '$status',

      // post info:
      postContent: '$postData.content',
      postAttachments: '$postData.attachments',

      // author Info:
      authorId: '$author',
      authorName: '$authorInfo.name',
      authorProfileImage: '$authorInfo.profileImage',

      // timestamps:
      reportedAt: '$createdAt',
    },
  })

  // date filters:
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
        reportedAt: dateFilter,
      },
    })
  }

  // searchable fields :
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => {
          return {
            [field]: {
              $regex: searchTerm,
              $options: 'i',
            },
          }
        }),
      },
    })
  }

  // Sorting
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'desc' ? -1 : 1,
    },
  })

  // Limit && Pagination :
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

  // retrived all the reports:
  const reports = await Report.aggregate(pipeline)

  const data = reports?.[0].data
  const total = reports?.[0]?.meta?.[0]?.total || 0
  const totalPages = Math.ceil(total / dataLimit)

  return {
    data,
    meta: {
      page: dataPage,
      limit: dataLimit,
      total,
      totalPages,
    },
  }
}

// 2. Report Get all the posts:
export const reportServices = {
  reportPost,
  getAllReports,
}
