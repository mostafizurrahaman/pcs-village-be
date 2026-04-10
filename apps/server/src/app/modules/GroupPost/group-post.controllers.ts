import { getUserFromRequest } from '@app/libs/get-user-from-requests'
import { catchAsync, sendResponse } from '@repo/shared'

import httpStatus from 'http-status'
import { groupPostServices } from './group-post.services'
import type { TGetAllGroupPostsQuery } from './group-post.validation'

// 1. Create Community Post:
const createGroupPost = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]

  const result = await groupPostServices.createGroupPost(user, body, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'The post published successfully!',
    data: result,
  })
})

// // 2. Delete Group Post Attachment by  post id:
const deleteGroupPostAttachment = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const postId = req.params.id as string

  const result = await groupPostServices.deletePostAttachment(user, postId, req.body.url)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The attachments has been deleted successfully!',
    data: result,
  })
})

// // 3. Update Community Post:
const updateGroupPost = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]
  const postId = req.params.id as string

  const result = await groupPostServices.updateGroupPost(user, body, files, postId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post has been updated successfully!',
    data: result,
  })
})

// // 4. Get Community Post by id:
const getPostById = catchAsync(async (req, res) => {
  const postId = req.params.id as string

  const result = await groupPostServices.getPostById(postId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post is retrived successfully!',
    data: result,
  })
})

// 5. delete Post by id:
const deletePostById = catchAsync(async (req, res) => {
  const postId = req.params.id as string
  const user = await getUserFromRequest(req)

  const result = await groupPostServices.deletePostById(user, postId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'The post is deleted successfully!',
    data: result,
  })
})

// 6. get user all post for group:
const getUserGroupPosts = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAllGroupPostsQuery
  const user = await getUserFromRequest(req)

  const result = await groupPostServices.getUserGroupPostsByUserId(user, query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'All group posts are retrived successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const groupPostControllers = {
  createGroupPost,
  deleteGroupPostAttachment,
  updateGroupPost,
  getPostById,
  deletePostById,
  getUserGroupPosts,
}
