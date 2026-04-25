import {
  GroupPost,
  GroupPostComment,
  GroupMember,
  MembershipStatus,
  type IUser,
  type IGroupPostDoc,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import mongoose, { Types } from 'mongoose'
import { deleteMultipleFilesFromS3, uploadMultipleFileToS3 } from '@repo/media-hub'
import type {
  TCreateGroupCommentPayload,
  TGetAllCommentsByPostIdQuery,
} from './group-post-comment.validations'
import { notificationServices } from '../Notification/notification.services'

const createComment = async (
  user: IUser,
  data: TCreateGroupCommentPayload,
  files: Express.Multer.File[]
) => {
  const { content, post, parent } = data

  // 1. Verify Group Post exists
  const existingPost = await GroupPost.findById(post)
  if (!existingPost) throw new AppError(httpStatus.NOT_FOUND, 'Group post not found!')

  // 2. EXTRA VALIDATION: Check if user is an ACTIVE member of the group associated with the post
  const isMember = await GroupMember.findOne({
    user: user._id,
    group: existingPost.group,
    status: MembershipStatus.ACTIVE,
  })
  if (!isMember)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You must be an active member of this group to comment.'
    )

  // 3. Handle Parent Comment existence
  let parentComment = null
  if (parent) {
    parentComment = await GroupPostComment.findById(parent)
    if (!parentComment) {
      throw new AppError(httpStatus.NOT_FOUND, `Parent comment doesn't exists!`)
    }
  }

  // 4. Upload attachments
  let attachments: string[] = []
  if (files && files.length > 0) {
    const uploaded = await uploadMultipleFileToS3(files, 'groupCommentAttachments')
    attachments = uploaded.map((f) => f.url)
  }

  const comment = await GroupPostComment.create({
    author: user._id,
    post,
    parent: parentComment?._id as Types.ObjectId,
    content,
    attachments,
  })

  if (user?._id?.toString() !== existingPost.author?.toString()) {
    await notificationServices.createAndSendNotification(
      {
        receiver: existingPost.author,
        sender: user?._id,
        type: 'GROUP_POST_COMMENT',
        title: 'New Comment!',
        message: `${user.name} commneted on your post!`,
        entityId: existingPost._id,
        entityModel: 'GroupPost',
      },
      null
    )
  }

  return comment
}

const getAllCommentsByPostID = async (
  user: IUser,
  postId: string,
  query: TGetAllCommentsByPostIdQuery
) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query
  const skip = (Number(page) - 1) * Number(limit)

  //  1. check is the post exists ? :
  const post = await GroupPost.findById(postId)
  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, `Post doesn't exists!`)
  }

  const comments = await GroupPostComment.aggregate([
    { $match: { post: new Types.ObjectId(postId) } },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'author',
        pipeline: [{ $project: { name: 1, email: 1, profileImage: 1 } }],
      },
    },
    { $unwind: '$author' },
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
    { $sort: { createdAt: 1 } },
    {
      $facet: {
        roots: [
          { $match: { parent: null } },
          { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
          { $skip: skip },
          { $limit: Number(limit) },
        ],
        replies: [{ $match: { parent: { $ne: null } } }],
        totalCount: [{ $match: { parent: null } }, { $count: 'total' }],
      },
    },
    {
      $project: {
        total: { $arrayElemAt: ['$totalCount.total', 0] },
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
                      cond: { $eq: ['$$reply.parent', '$$root._id'] },
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

  return {
    data: comments[0]?.comments || [],
    meta: {
      total: comments[0]?.total || 0,
      page: Number(page),
      totalPages: Math.ceil(comments[0]?.total / Number(limit)) || 0,
      limit: Number(limit),
    },
  }
}

/**
 * Deletes a group comment, its nested replies, and cleans up S3 attachments
 */
const deleteComment = async (user: IUser, commentId: string) => {
  // 1. Verify if the target comment exists
  const comment = await GroupPostComment.findById(commentId).populate<{ post: IGroupPostDoc }>(
    'post'
  )

  if (!comment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Comment not found!')
  }

  // 2. Authorization: Ensure the requester is the owner of the comment
  if (user?._id?.toString() !== comment?.author?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to delete this comment!')
  }

  const membership = await GroupMember.findOne({
    user: user?._id,
    group: comment?.post?.group,
    status: MembershipStatus.ACTIVE,
  })

  if (!membership) {
    throw new AppError(httpStatus.BAD_REQUEST, `You don't have active membership into this group!`)
  }

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 3. Find the main comment and its direct replies to collect all attachment URLs
    // This ensures that if you delete a parent, the children's images are also cleared from S3
    const relatedComments = await GroupPostComment.find({
      $or: [{ _id: comment._id }, { parent: comment._id }],
    }).session(session)

    // 4. Extract all S3 URLs from the comment and its replies
    const allAttachments: string[] = relatedComments.reduce((acc, curr) => {
      if (Array.isArray(curr.attachments) && curr.attachments.length > 0) {
        return [...acc, ...curr.attachments]
      }
      return acc
    }, [] as string[])

    const allCommentIds = relatedComments.map((c) => c._id)

    // 5. Bulk delete the main comment and its replies from MongoDB
    await GroupPostComment.deleteMany({ _id: { $in: allCommentIds } }, { session })

    // 6. Commit database changes before interacting with S3
    await session.commitTransaction()
    session.endSession()

    // 7. Cleanup S3: Remove physical files only if the DB deletion was successful
    if (allAttachments.length > 0) {
      // Use unique values to avoid redundant S3 calls
      const uniqueFiles = [...new Set(allAttachments)]
      await deleteMultipleFilesFromS3(uniqueFiles)
    }

    return { deletedCount: allCommentIds.length }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Rollback DB changes if any error occurs during the transaction
    await session.abortTransaction()
    session.endSession()

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to delete comment'
    )
  }
}

export const GroupCommentServices = {
  createComment,
  getAllCommentsByPostID,
  deleteComment,
}
