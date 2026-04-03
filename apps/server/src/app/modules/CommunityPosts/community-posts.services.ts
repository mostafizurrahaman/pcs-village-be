import {
  CommunityComment,
  CommunityPost,
  DutyStation,
  PostLike,
  UserProfile,
  type IUser,
} from 'packages/db/src'
import type { TCreateCommunityPayload } from './community-posts.validations'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import {
  deleteMultipleFilesFromS3,
  deleteSingleFileFromS3,
  uploadMultipleFileToS3,
} from 'packages/media-hub/src'
import mongoose from 'mongoose'

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
      _id: existingPost,
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
  return post
}

// 5. delete post by id:
const deletePostById = async (user: IUser, postId: string) => {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // 1. Check post
    const existingPost = await CommunityPost.findById(postId).session(session)

    if (!existingPost) {
      throw new AppError(httpStatus.NOT_FOUND, `Post not found!`)
    }

    // 2. Authorization check
    if (existingPost.author?.toString() !== user?._id?.toString()) {
      throw new AppError(httpStatus.FORBIDDEN, `You are not allowed to delete this post.`)
    }

    // 3. Delete related comments
    await CommunityComment.deleteMany({ post: existingPost._id }, { session })

    // 4. Delete related likes
    await PostLike.deleteMany({ post: existingPost._id }, { session })

    // 5. Delete post
    const deletedPost = await CommunityPost.findByIdAndDelete(postId, {
      session,
    })

    // ⚠️ IMPORTANT: commit DB changes first
    await session.commitTransaction()
    session.endSession()

    // 6. Delete attachments AFTER commit (external service)
    if (existingPost.attachments?.length > 0) {
      await deleteMultipleFilesFromS3(existingPost.attachments)
    }

    return deletedPost
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

export const communityServices = {
  createCommunityPost,
  deletePostAttachment,
  updateCommunityPost,
  deletePostById,
  getPostById,
}
