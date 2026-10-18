import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'
import { communityPostServices } from './community-posts.services'
import httpStatus from 'http-status'
import type { TGetUserCommunityPostQuery } from './community-posts.validations'

// 1. Create Community Post:
const createCommunityPost = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]

  const result = await communityPostServices.createCommunityPost(user, body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The post published successfully!',
    data: result,
  })
})

// 2. Delete Community Post Attachment by  post id:
const deleteCommunityPostAttachment = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const postId = req.params.id as string

  const result = await communityPostServices.deletePostAttachment(user, postId, req.body.url)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The attachments has been deleted successfully!',
    data: result,
  })
})

// 3. Update Community Post:
const updateCommunityPost = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]
  const postId = req.params.id as string

  const result = await communityPostServices.updateCommunityPost(user, body, files, postId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post has been updated successfully!',
    data: result,
  })
})

// 4. Get Community Post by id:
const getCommunityPostById = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const postId = req.params.id as string

  const result = await communityPostServices.getPostById(postId, user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post is retrived successfully!',
    data: result,
  })
})

// 5. delete Post by id:
const deleteCommunityPostById = catchAsync(async (req, res) => {
  const postId = req.params.id as string
  const user = await getUserFromRequest(req)

  const result = await communityPostServices.deletePostById(user, postId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post is deleted successfully!',
    data: result,
  })
})

// 5. delete Post by id:
const getUserCommunityPosts = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetUserCommunityPostQuery
  const user = await getUserFromRequest(req)

  const result = await communityPostServices.getUserCommunityPostsByUserId(user, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All community posts are retrived successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const communityPostControllers = {
  createCommunityPost,
  deleteCommunityPostAttachment,
  updateCommunityPost,
  getCommunityPostById,
  deleteCommunityPostById,
  getUserCommunityPosts,
}
