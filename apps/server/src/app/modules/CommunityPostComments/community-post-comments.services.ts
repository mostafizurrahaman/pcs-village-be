import { CommunityComment, CommunityPost, type IUser } from '@repo/db'

import httpStatus from 'http-status'
import type { TCreateCommentPayload } from './community-post-comments.validations'
import { AppError } from 'packages/shared/src'
import { deleteMultipleFilesFromS3, uploadMultipleFileToS3 } from 'packages/media-hub/src'
import type { Types } from 'mongoose'
import mongoose from 'mongoose'

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
  // 1. Check comment
  const comment = await CommunityComment.findById(id)

  if (!comment) {
    throw new AppError(httpStatus.NOT_FOUND, `Comment doesn't exists!`)
  }

  //   2. check this belongs to current user ?
  if (user?._id?.toString() !== comment?.author?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, `You dont't have permission to delete this comment!`)
  }

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const nestedComments = await CommunityComment.aggregate([
      {
        $match: {
          parent: comment?._id,
          attachments: { $exists: true, $not: { $size: 0 } },
        },
      },
      {
        $unwind: '$attachments',
      },
      {
        $group: {
          _id: null,
          allAttachments: { $push: '$attachments' },
        },
      },
      {
        $project: {
          _id: 0,
          allAttachments: 1,
        },
      },
    ])

    await deleteMultipleFilesFromS3(nestedComments?.[0].attachments)

    await CommunityComment.deleteMany(
      {
        parent: comment?._id,
      },
      {
        session,
      }
    )

    const deletedComment = await CommunityComment.findOneAndDelete(
      {
        _id: comment?._id,
      },
      {
        session,
      }
    )

    if (
      deletedComment &&
      Array.isArray(deletedComment?.attachments) &&
      deletedComment.attachments.length > 0
    ) {
      await deleteMultipleFilesFromS3(deletedComment.attachments)
    }

    await session.commitTransaction()
    await session.endSession()

    return deletedComment
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await session.abortTransaction()
    throw new AppError(httpStatus.BAD_REQUEST, error as any)
  }
}

export const CommunityPostComments = {
  createComment,
  getCommentById,
  deleteCommentById,
}
