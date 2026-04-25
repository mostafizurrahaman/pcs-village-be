import { CommunityComment, CommunityPost, type IUser } from '@repo/db'

import httpStatus from 'http-status'
import type {
  TCreateCommentPayload,
  TGetAllCommentsByPostQuery,
} from './community-post-comments.validations'
import { AppError } from 'packages/shared/src'
import { deleteMultipleFilesFromS3, uploadMultipleFileToS3 } from 'packages/media-hub/src'
import type { Types } from 'mongoose'
import mongoose from 'mongoose'
import { notificationServices } from '../Notification/notification.services'

// 1. create comment:
const createComment = async (
  user: IUser,
  data: TCreateCommentPayload,
  files: Express.Multer.File[]
) => {
  const { content, post, parent } = data

  // check community post existence:
  const communityPost = await CommunityPost.findById(post)
  if (!communityPost) {
    throw new AppError(httpStatus.NOT_FOUND, `Community post doesn't exists!`)
  }

  // check parent comment existence :
  let parentComment = null
  if (parent) {
    parentComment = await CommunityComment.findById(parent)
    if (!parentComment) {
      throw new AppError(httpStatus.NOT_FOUND, `Parent comment doesn't exists!`)
    }
  }

  //   upload files:
  const attachments = []
  if (files?.length > 3) {
    throw new AppError(httpStatus.BAD_REQUEST, `You can not upload more than 3 images.`)
  }

  if (files?.length > 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'communityComments')
    attachments.push(...uploadedFiles.map((file) => file.url))
  }

  // create comment :
  const comment = await CommunityComment.create({
    author: user?._id,
    post: communityPost?._id,
    parent: parentComment?._id as Types.ObjectId,
    content,
    attachments,
  })

  if (user?._id?.toString() !== communityPost.author?.toString()) {
    await notificationServices.createAndSendNotification(
      {
        receiver: communityPost?.author as Types.ObjectId,
        sender: user?._id,
        type: 'POST_COMMENT',
        title: 'New Comment!',
        message: `${user.name} is commented on your post!`,
        entityId: communityPost._id,
        entityModel: 'CommunityPost',
      },
      null
    )
  }
  return comment
}

// 2. Get comment by id :
const getCommentById = async (id: string) => {
  const comment = await CommunityComment.findById(id)

  if (!comment) {
    throw new AppError(httpStatus.NOT_FOUND, `Comment doesn't exists!`)
  }

  return comment
}

// 3. Delete Comment by id:
const deleteCommentById = async (user: IUser, id: string) => {
  // 1. Verify if the target comment exists
  const comment = await CommunityComment.findById(id)

  if (!comment) {
    throw new AppError(httpStatus.NOT_FOUND, `Comment doesn't exist!`)
  }

  // 2. Authorization: Ensure the requester is the owner of the comment
  if (user?._id?.toString() !== comment?.author?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `You do not have permission to delete this comment!`)
  }

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 3. Find the main comment and its direct replies to collect all attachment URLs
    const relatedComments = await CommunityComment.find({
      $or: [{ _id: comment._id }, { parent: comment._id }],
    }).session(session)

    // 4. Extract all S3 file keys/URLs from the comment and its replies
    const allAttachments: string[] = relatedComments.reduce((acc, curr) => {
      if (Array.isArray(curr.attachments) && curr.attachments.length > 0) {
        return [...acc, ...curr.attachments]
      }
      return acc
    }, [] as string[])

    const allCommentIds = relatedComments.map((c) => c._id)

    // 5. Bulk delete the main comment and its replies from MongoDB
    await CommunityComment.deleteMany({ _id: { $in: allCommentIds } }, { session })

    // 6. Commit database changes before interacting with S3 (Avoid long-running locks)
    await session.commitTransaction()
    await session.endSession()

    // 7. Cleanup S3: Remove physical files only if the DB deletion was successful
    if (allAttachments.length > 0) {
      await deleteMultipleFilesFromS3(allAttachments)
    }

    return comment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Rollback DB changes if any error occurs during the transaction
    await session.abortTransaction()
    await session.endSession()

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to delete comment'
    )
  }
}

// 4. Get all the comments for specific post:
const getAllCommentsByPostID = async (
  user: IUser,
  postId: string,
  query: TGetAllCommentsByPostQuery
) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query

  const dataLimit = Number(limit) || 10
  const dataPage = Number(page) || 1
  const skip = (dataPage - 1) * limit

  // 1. check is the post exists ?
  const post = await CommunityPost.findById(postId)

  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, `Post deosn't exists!`)
  }

  const comments = await CommunityComment.aggregate([
    {
      $match: {
        post: post?._id,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              profile: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: '$author',
    },
    {
      $addFields: {
        authorName: {
          $ifNull: ['$author.name', null],
        },
        authorEmail: {
          $ifNull: ['$author.email', null],
        },
        authorProfileImg: {
          $ifNull: ['$author.profileImgage', null],
        },

        isMyComment: {
          $eq: ['$author._id', user?._id],
        },
      },
    },
    {
      $project: {
        author: 0,
      },
    },
    {
      $sort: { createdAt: 1 },
    },

    {
      $facet: {
        roots: [
          {
            $match: {
              parent: { $exists: false },
            },
          },
          {
            $sort: {
              [sortBy]: sortOrder === 'asc' ? 1 : -1,
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: dataLimit,
          },
        ],
        replies: [
          {
            $match: {
              parent: { $exists: true },
            },
          },
        ],
        totalCount: [
          {
            $match: {
              parent: { $exists: false },
            },
          },
          {
            $count: 'total',
          },
        ],
      },
    },

    {
      $project: {
        totalCount: 1,
        comments: {
          $map: {
            input: '$roots',
            as: 'root',
            in: {
              $mergeObjects: [
                '$$root',
                {
                  replies: {
                    $filter: {
                      input: '$replies',
                      as: 'reply',
                      cond: {
                        $eq: ['$$reply.parent', '$$root._id'],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  ])

  const total = comments?.[0]?.totalCount?.[0]?.total || 0
  const totalPages = Math.ceil(total / dataLimit)
  const data = comments?.[0].comments

  return {
    meta: {
      page: dataPage,
      limit: dataLimit,
      total,
      totalPages,
    },
    data,
  }
}

export const CommunityPostComments = {
  createComment,
  getCommentById,
  deleteCommentById,
  getAllCommentsByPostID,
}
