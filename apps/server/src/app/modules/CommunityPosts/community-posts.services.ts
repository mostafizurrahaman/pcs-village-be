import {
  CommunityComment,
  CommunityPost,
  DutyStation,
  PostLike,
  UserProfile,
  type IUser,
} from '@repo/db'
import type {
  TCreateCommunityPayload,
  TGetUserCommunityPostQuery,
} from './community-posts.validations'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import {
  deleteMultipleFilesFromS3,
  deleteSingleFileFromS3,
  uploadMultipleFileToS3,
} from 'packages/media-hub/src'
import mongoose, { type PipelineStage } from 'mongoose'
import { logger } from '@app/libs/logger'

// 1. create Community post :
const createCommunityPost = async (
  user: IUser,
  data: TCreateCommunityPayload,
  files: Express.Multer.File[]
) => {
  const { content } = data

  // 1. Check the user and get user profile:
  const profile = await UserProfile.findOne({
    user: user?._id,
  })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found!')
  }

  // 2. Check current station exists?:
  const currentStation = await DutyStation.findById(profile.currentStation)
  if (!currentStation) {
    throw new AppError(httpStatus.NOT_FOUND, `Current station doesn't exists!`)
  }

  //  3. Check is there any attachments:
  if (Array.isArray(files) && files.length > 5) {
    throw new AppError(httpStatus.NOT_FOUND, `You can only upload 5 attachments!`)
  }

  const attachments = []
  if (Array.isArray(files) && files.length > 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'communityPosts')
    attachments.push(...uploadedFiles.map((f) => f.url))
  }

  // 4. Create post now:

  const post = await CommunityPost.create({
    author: user?._id,
    station: currentStation?._id,
    content,
    attachments,
  })

  return post
}

// 2. Delete community attachments:
const deletePostAttachment = async (user: IUser, postId: string, url: string) => {
  // 1. Check the user and get user profile:
  const existingPost = await CommunityPost.findById(postId)
  if (!existingPost) {
    throw new AppError(httpStatus.NOT_FOUND, 'Post not found!')
  }

  //   2. Check is that post belogs to your account :
  if (existingPost.author?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, `This post doesn't belongs you!`)
  }

  //  3. Check is there any attachments:

  const post = await CommunityPost.findOneAndUpdate(
    {
      _id: existingPost?._id,
    },
    {
      $pull: {
        attachments: url,
      },
    }
  )

  // 4. delete from aws also :
  await deleteSingleFileFromS3(url)

  return post
}

// 3. Update Community post :
const MAX_ATTACHMENTS = 5

const updateCommunityPost = async (
  user: IUser,
  data: TCreateCommunityPayload,
  files: Express.Multer.File[],
  postId: string
) => {
  const { content } = data

  // 1. Check post
  const existingPost = await CommunityPost.findOne({
    _id: postId,
    author: user?._id,
  })
  if (!existingPost) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exist!`)
  }

  // 2. Profile
  const profile = await UserProfile.findOne({ user: user?._id })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found!')
  }

  // 3. Station check (optimized)
  const stationExists = await DutyStation.exists({
    _id: profile.currentStation,
  })
  if (!stationExists) {
    throw new AppError(httpStatus.NOT_FOUND, `Current station doesn't exist!`)
  }

  // 4. Attachment validation
  const existingAttachments = existingPost.attachments || []
  if (files.length + existingAttachments.length > MAX_ATTACHMENTS) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can upload up to ${MAX_ATTACHMENTS} attachments!`
    )
  }

  // 5. Upload new files (if any)
  let newAttachments: string[] = []

  if (files.length > 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'communityPosts')
    newAttachments = uploadedFiles.map((f) => f.url)
  }

  // 6. Update fields
  existingPost.content = content ?? existingPost.content

  if (files.length > 0) {
    existingPost.attachments = [...existingAttachments, ...newAttachments]
  }

  await existingPost.save()

  return existingPost
}

// 4. Get post by id:
const getPostById = async (postId: string) => {
  const post = await CommunityPost.findById(postId)

  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, `Post not found!`)
  }
  return post
}

// 5. delete post by id:
const deletePostById = async (user: IUser, postId: string) => {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 1. Check if post exists
    const existingPost = await CommunityPost.findById(postId).session(session)

    if (!existingPost) {
      throw new AppError(httpStatus.NOT_FOUND, `Post not found!`)
    }

    // 2. Authorization check
    if (existingPost.author?.toString() !== user?._id?.toString()) {
      throw new AppError(httpStatus.FORBIDDEN, `You are not allowed to delete this post.`)
    }

    // 3. COLLECT ALL COMMENT ATTACHMENTS BEFORE DELETING FROM DB
    // Fetch only the attachments field from all comments related to this post
    const commentsWithFiles = await CommunityComment.find(
      { post: postId, attachments: { $exists: true, $not: { $size: 0 } } },
      { attachments: 1 }
    ).session(session)

    // Flatten the array of arrays into a single list of S3 URLs/Keys
    const allCommentAttachments = commentsWithFiles.reduce((acc, curr) => {
      return [...acc, ...(curr.attachments || [])]
    }, [] as string[])

    // 4. Delete related comments from Database
    await CommunityComment.deleteMany({ post: postId }, { session })

    // 5. Delete related likes from Database
    await PostLike.deleteMany({ post: postId }, { session })

    // 6. Delete the Post itself from Database
    const deletedPost = await CommunityPost.findByIdAndDelete(postId, { session })

    // 7. Commit DB changes
    await session.commitTransaction()
    session.endSession()

    // 8. CLEANUP S3 (External Service)
    // Combine post attachments and comment attachments for a single S3 cleanup call
    const filesToDelete = [...(existingPost.attachments || []), ...allCommentAttachments]

    if (filesToDelete.length > 0) {
      // It's better to filter for unique values if a file might be referenced twice
      const uniqueFiles = [...new Set(filesToDelete)]
      logger.info('uniqueFiles', uniqueFiles)
      await deleteMultipleFilesFromS3(uniqueFiles)
    }

    return deletedPost
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

// 6. Get all post relevant to me in my community:
const getUserCommunityPostsByUserId = async (user: IUser, query: TGetUserCommunityPostQuery) => {
  const {
    fromDate,
    toDate,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 10,
    page = 1,
  } = query

  const dataLimit = Number(limit)
  const skip = (Number(page) - 1) * dataLimit

  // 1. Check the user and get user profile:
  const profile = await UserProfile.findOne({
    user: user?._id,
  })
  if (!profile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Profile not found!')
  }

  const stationIds = []
  // 2. Check current station exists?:
  const currentStation = await DutyStation.findById(profile.currentStation)
  if (!currentStation) {
    throw new AppError(httpStatus.NOT_FOUND, `Current station doesn't exists!`)
  }
  stationIds.push(currentStation?._id)

  // 3. Check current station exists?:
  let futureStation = null
  if (profile.futureStation) {
    futureStation = await DutyStation.findById(profile.futureStation)
    if (!futureStation) {
      throw new AppError(httpStatus.NOT_FOUND, `Future station doesn't exists!`)
    }
  }
  stationIds.push(futureStation?._id)

  const pipeline: PipelineStage[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchingStage: PipelineStage = {
    $match: {
      station: {
        $in: stationIds,
      },
    },
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }
    matchingStage.$match.createdAt = dateFilter
  }

  pipeline.push(matchingStage)

  // prepare station lookup :
  pipeline.push({
    $lookup: {
      from: 'dutystations',
      localField: 'station',
      foreignField: '_id',
      as: 'station',
    },
  })

  pipeline.push({
    $unwind: {
      path: '$station',
      preserveNullAndEmptyArrays: true,
    },
  })

  // prepare station lookup :
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'author',
      pipeline: [
        {
          $lookup: {
            from: 'userprofiles',
            let: {
              userId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$$userId', '$user'],
                  },
                },
              },
            ],
            as: 'profile',
          },
        },
        {
          $unwind: {
            path: '$profile',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            password: 0,
            twoFactorBackupCodes: 0,
          },
        },
      ],
    },
  })

  pipeline.push({
    $unwind: {
      path: '$author',
      preserveNullAndEmptyArrays: true,
    },
  })

  pipeline.push({
    $lookup: {
      from: 'communitycomments',
      let: {
        postId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$$postId', '$post'],
            },
          },
        },
      ],
      as: 'comments',
    },
  })

  pipeline.push({
    $lookup: {
      from: 'postlikes',
      let: {
        postId: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$$postId', '$post'],
            },
          },
        },
      ],
      as: 'likes',
    },
  })

  // Final projection
  pipeline.push({
    $project: {
      _id: 1,
      content: 1,
      attachments: 1,

      // Flatten author
      authorId: '$author._id',
      authorName: '$author.name',
      authorEmail: '$author.email',
      authorStatus: '$author.status',
      authorRole: '$author.role',
      authorImage: '$author.profileImage',
      affiliation: '$author.profile.affiliation',
      // Flatten station
      stationId: '$station._id',
      stationName: '$station.name',
      stationCountry: '$station.country',
      stationState: '$station.state',
      stationCity: '$station.city',
      stationType: '$station.type',
      comments: {
        $size: '$comments',
      },
      likes: {
        $size: '$likes',
      },

      // timestamps
      createdAt: 1,
      updatedAt: 1,
    },
  })

  // searchable fields:
  const searchableFields = [
    'authorName',
    'authorEmail',
    'stationName',
    'stationCountry',
    'stationCity',
    'stationType',
    'content',
  ]

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => {
          return { [field]: { $regex: searchTerm, $options: 'i' } }
        }),
      },
    })
  }

  // sorting:
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    },
  })

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

  // 4. Run Aggregation :
  const posts = await CommunityPost.aggregate(pipeline)

  const data = posts[0].data
  const total = posts[0]?.meta[0]?.total || 0
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    meta: {
      page: Number(page),
      limit: dataLimit,
      total,
      totalPages,
    },
  }
}

export const communityPostServices = {
  createCommunityPost,
  deletePostAttachment,
  updateCommunityPost,
  deletePostById,
  getPostById,
  getUserCommunityPostsByUserId,
}
